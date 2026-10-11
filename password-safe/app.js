'use strict';

// Password Safe: everything stays on this device.
// The vault is encrypted with AES-256-GCM using a key derived from the
// master password with PBKDF2-SHA256. The master password and the key are
// never stored in readable form; only the encrypted vault, its salt and IV.
//
// Fingerprint unlock uses a passkey with the WebAuthn PRF extension: the
// phone's fingerprint sensor releases a secret that only exists inside the
// phone's secure hardware. That secret encrypts a copy of the master
// password, so a fingerprint can stand in for typing it.

const PBKDF2_ITERATIONS = 600000;
const AUTO_LOCK_MS = 2 * 60 * 1000;     // no taps for 2 minutes
const AWAY_LOCK_MS = 30 * 1000;         // left the app for 30 seconds
const BACKUP_REMINDER_DAYS = 30;
const MIN_MASTER_LENGTH = 8;
const FORMAT = 'password-safe';

const $ = (id) => document.getElementById(id);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// ---------- Storage (IndexedDB) ----------

const DB_NAME = 'password-safe';
const STORE = 'kv';
let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function dbRequest(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const dbGet = (k) => dbRequest('readonly', (s) => s.get(k));
const dbSet = (k, v) => dbRequest('readwrite', (s) => s.put(v, k));
const dbDelete = (k) => dbRequest('readwrite', (s) => s.delete(k));

// ---------- Encryption ----------

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey(
    'raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']);
}

async function encryptPayload(key, payload) {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, textEncoder.encode(JSON.stringify(payload)));
  return { iv: toBase64(iv), data: toBase64(data) };
}

// Throws if the key is wrong (AES-GCM authentication fails).
async function decryptPayload(key, record) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(record.iv) }, key, fromBase64(record.data));
  return JSON.parse(textDecoder.decode(plain));
}

function isVaultRecord(r) {
  return r && r.format === FORMAT && r.kdf && typeof r.kdf.salt === 'string' &&
    Number.isInteger(r.kdf.iterations) && typeof r.iv === 'string' && typeof r.data === 'string';
}

// Returns { key, entries } or throws if the password is wrong.
async function openVault(record, password) {
  const key = await deriveKey(password, fromBase64(record.kdf.salt), record.kdf.iterations);
  const payload = await decryptPayload(key, record);
  return { key, entries: Array.isArray(payload.entries) ? payload.entries : [] };
}

async function newVaultKey(password) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const kdf = { name: 'PBKDF2-SHA256', iterations: PBKDF2_ITERATIONS, salt: toBase64(salt) };
  return { key, kdf };
}

// ---------- Fingerprint (WebAuthn PRF) ----------

class BioError extends Error {}

async function bioSupported() {
  if (!window.PublicKeyCredential || !navigator.credentials || !window.isSecureContext) return false;
  try {
    if (PublicKeyCredential.getClientCapabilities) {
      const caps = await PublicKeyCredential.getClientCapabilities();
      if (caps['extension:prf'] === false) return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function prfToKey(prfOutput) {
  const base = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: textEncoder.encode('password-safe fingerprint v1') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']);
}

// Asks for the fingerprint and returns the passkey's PRF secret.
async function bioEvaluate(credentialId, prfSalt) {
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: credentialId, transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000,
      extensions: { prf: { eval: { first: prfSalt } } },
    },
  });
  const prf = cred.getClientExtensionResults().prf;
  if (!prf || !prf.results || !prf.results.first) throw new BioError('unsupported');
  return new Uint8Array(prf.results.first);
}

async function enableBio(masterPassword) {
  const prfSalt = randomBytes(32);
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Password Safe' },
      user: { id: randomBytes(16), name: 'Password Safe', displayName: 'Password Safe' },
      challenge: randomBytes(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
      attestation: 'none',
      timeout: 60000,
      extensions: { prf: { eval: { first: prfSalt } } },
    },
  });
  const prf = cred.getClientExtensionResults().prf;
  if (!prf || prf.enabled === false) throw new BioError('unsupported');
  const credentialId = new Uint8Array(cred.rawId);
  // Some phones return the secret on creation; others need one more touch.
  const output = prf.results && prf.results.first
    ? new Uint8Array(prf.results.first)
    : await bioEvaluate(credentialId, prfSalt);
  const sealed = await encryptPayload(await prfToKey(output), { password: masterPassword });
  await dbSet('biometric', { credentialId: toBase64(credentialId), prfSalt: toBase64(prfSalt), ...sealed });
}

async function disableBio() {
  await dbDelete('biometric');
}

function bioErrorMessage(err) {
  if (err instanceof BioError) return "Sorry, this phone can't use fingerprint unlock for this app.";
  if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) return null; // cancelled
  if (err && err.name === 'InvalidStateError') return 'Fingerprint unlock is already set up. Please try again.';
  return "Fingerprint didn't work. Please try again.";
}

// ---------- Password tools ----------

function randomInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}

function generatePassword(length = 16) {
  // Look-alike characters (0/O, 1/l/I) are left out so it's easy to type.
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%&*?-_'];
  const all = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const COMMON = /^(password|passw0rd|123456|12345678|123456789|qwerty|letmein|welcome|iloveyou|admin|abc123|111111)/i;

function passwordScore(pw) {
  if (!pw) return null;
  if (pw.length < 8) return 1;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (kinds >= 3) score++;
  if (COMMON.test(pw) || /^(.)\1+$/.test(pw)) score = 1;
  return Math.max(1, Math.min(4, score));
}

const STRENGTH_LABELS = { 1: 'Weak', 2: 'Okay', 3: 'Strong', 4: 'Very strong' };

function updateStrength(input) {
  const meter = $(input.dataset.strength);
  const score = passwordScore(input.value);
  meter.hidden = score === null;
  if (score === null) return;
  meter.dataset.score = score;
  meter.querySelector('span').textContent =
    input.value.length < MIN_MASTER_LENGTH ? 'Too short' : STRENGTH_LABELS[score];
}

document.querySelectorAll('[data-strength]').forEach((input) =>
  input.addEventListener('input', () => updateStrength(input)));

// ---------- App state ----------

let vaultKey = null;      // CryptoKey while unlocked, null when locked
let vaultRecord = null;   // encrypted record as stored
let entries = [];         // decrypted entries while unlocked
let currentId = null;     // entry being viewed / edited
let offerPassword = null; // held only while the fingerprint offer is on screen
let lastActivity = Date.now();
let hiddenAt = null;
let installPrompt = null;
let canUseBio = false;
let autoBioAllowed = true;

const LOCKED_SCREENS = ['setup', 'unlock', 'forgot', 'restore'];
const UNLOCKED_SCREENS = ['list', 'view', 'edit', 'settings', 'change', 'restore', 'bio'];

async function saveVault() {
  const { iv, data } = await encryptPayload(vaultKey, { entries });
  vaultRecord = { ...vaultRecord, iv, data, updated: new Date().toISOString() };
  await dbSet('vault', vaultRecord);
}

function findEntry(id) {
  return entries.find((e) => e.id === id);
}

// ---------- Navigation ----------

function show(name) {
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== 'screen-' + name; });
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);
  const render = renderers[name];
  if (render) render();
}

function go(name) {
  history.pushState({ screen: name }, '');
  show(name);
}

function goBase(name) {
  history.replaceState({ screen: name }, '');
  show(name);
}

window.addEventListener('popstate', (e) => {
  const name = e.state && e.state.screen;
  closeDialog(false);
  if (vaultKey) {
    show(UNLOCKED_SCREENS.includes(name) && (name !== 'view' || findEntry(currentId)) ? name : 'list');
  } else if (LOCKED_SCREENS.includes(name) && name !== 'setup' && name !== 'unlock') {
    show(name);
  } else {
    show(vaultRecord ? 'unlock' : 'setup');
  }
});

// ---------- Small helpers ----------

let toastTimer = null;
function toast(message) {
  const el = $('toast');
  $('toast-text').textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
}

function setError(id, message) {
  $(id).textContent = message || '';
}

function setIcon(container, name) {
  container.querySelector('use').setAttribute('href', '#i-' + name);
}

function setVisible(input, visible) {
  input.type = visible ? 'text' : 'password';
  const toggle = document.querySelector(`[data-toggle="${input.id}"]`);
  if (toggle) {
    setIcon(toggle, visible ? 'eye-off' : 'eye');
    toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  }
}

function clearInputs(ids) {
  ids.forEach((id) => {
    const el = $(id);
    el.value = '';
    if (el.dataset.toggled) setVisible(el, false);
    if (el.dataset.strength) $(el.dataset.strength).hidden = true;
  });
}

const copyTimers = new WeakMap();
async function copyText(text, button, message) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    toast("Couldn't copy. Tap the eye to see it and type it instead.");
    return;
  }
  const label = button.querySelector('span');
  if (!button.dataset.label) button.dataset.label = label.textContent;
  setIcon(button, 'check');
  label.textContent = 'Copied';
  clearTimeout(copyTimers.get(button));
  copyTimers.set(button, setTimeout(() => {
    setIcon(button, 'copy');
    label.textContent = button.dataset.label;
  }, 2000));
  toast(message);
}

function busy(button, isBusy) {
  button.setAttribute('aria-busy', String(isBusy));
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// In-app confirm dialog (the browser's own one shows the web address and looks alarming).
let dialogResolve = null;
function ask({ title, message, confirm = 'OK', danger = false }) {
  $('dialog-title').textContent = title;
  $('dialog-message').textContent = message;
  const ok = $('dialog-ok');
  ok.textContent = confirm;
  ok.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
  $('dialog').showModal();
  return new Promise((resolve) => { dialogResolve = resolve; });
}
function closeDialog(result) {
  if ($('dialog').open) $('dialog').close();
  if (dialogResolve) { dialogResolve(result); dialogResolve = null; }
}
$('dialog-ok').addEventListener('click', () => closeDialog(true));
$('dialog-cancel').addEventListener('click', () => closeDialog(false));
$('dialog').addEventListener('cancel', () => closeDialog(false));

// ---------- Locking ----------

function lock({ manual = false } = {}) {
  vaultKey = null;
  entries = [];
  currentId = null;
  offerPassword = null;
  autoBioAllowed = !manual;
  closeDialog(false);
  $('toast').hidden = true;
  clearInputs(['unlock-pw', 'edit-name', 'edit-username', 'edit-password', 'bio-pw',
    'change-old', 'change-new1', 'change-new2', 'restore-pw', 'search']);
  resetRestoreFile();
  $('view-password').textContent = '';
  $('view-username').textContent = '';
  $('entry-list').replaceChildren();
  setError('unlock-error', '');
  goBase('unlock');
}

function noteActivity() { lastActivity = Date.now(); }
['pointerdown', 'keydown', 'input', 'scroll'].forEach((ev) =>
  document.addEventListener(ev, noteActivity, { passive: true, capture: true }));

setInterval(() => {
  if (vaultKey && Date.now() - lastActivity > AUTO_LOCK_MS) lock();
}, 5000);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    return;
  }
  if (vaultKey && hiddenAt && Date.now() - hiddenAt > AWAY_LOCK_MS) lock();
  else if (vaultKey && Date.now() - lastActivity > AUTO_LOCK_MS) lock();
  else if (!vaultKey && document.body.dataset.screen === 'unlock') maybeAutoBio();
  hiddenAt = null;
});

async function afterUnlock(password) {
  noteActivity();
  goBase('list');
  // Offer fingerprint once, right after the master password was typed.
  if (password && canUseBio && !(await dbGet('biometric')) && !(await dbGet('bioDeclined'))) {
    offerPassword = password;
    $('bio-offer').hidden = false;
  }
}

// ---------- Screens ----------

const renderers = {
  list: renderList,
  view: renderView,
  settings: renderSettings,
  unlock: renderUnlock,
};

async function renderUnlock() {
  const bio = canUseBio && (await dbGet('biometric'));
  $('bio-unlock-btn').hidden = !bio;
  $('bio-divider').hidden = !bio;
  // Keep a single primary action: the fingerprint button when it's available.
  $('unlock-btn').className = 'btn ' + (bio ? 'btn-outline' : 'btn-primary');
  if (bio) maybeAutoBio();
  else setTimeout(() => $('unlock-pw').focus(), 50);
}

function maybeAutoBio() {
  if (!autoBioAllowed || document.hidden || $('bio-unlock-btn').hidden) return;
  autoBioAllowed = false;
  unlockWithBio();
}

function renderList() {
  const query = $('search').value.trim().toLowerCase();
  const list = $('entry-list');
  list.replaceChildren();
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const shown = sorted.filter((e) => !query ||
    e.name.toLowerCase().includes(query) || (e.username || '').toLowerCase().includes(query));

  for (const entry of shown) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'entry';
    btn.addEventListener('click', () => { currentId = entry.id; go('view'); });

    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = initial(entry.name);

    const text = document.createElement('span');
    text.className = 'entry-text';
    const name = document.createElement('div');
    name.className = 'entry-name';
    name.textContent = entry.name;
    const user = document.createElement('div');
    user.className = 'entry-user';
    user.textContent = entry.username || 'No username';
    text.append(name, user);

    btn.append(avatar, text, iconEl('chevron-right', 'icon icon-muted'));
    li.append(btn);
    list.append(li);
  }

  const count = entries.length;
  $('entry-count').textContent = count ? `${count} saved` : '';
  $('empty').hidden = count > 0;
  $('search-wrap').hidden = count === 0;
  $('no-results').hidden = count === 0 || shown.length > 0;
  renderBackupBanner();
}

function initial(name) {
  return (name.trim()[0] || '?').toUpperCase();
}

function iconEl(name, className) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}

async function renderBackupBanner() {
  const last = await dbGet('lastBackup');
  const days = last ? (Date.now() - new Date(last).getTime()) / 86400000 : Infinity;
  $('backup-banner').hidden = !(entries.length >= 3 && days > BACKUP_REMINDER_DAYS);
  $('backup-banner-text').textContent = last
    ? `Your last backup was on ${formatDate(last)}. Make a new one so it includes your latest passwords.`
    : 'If you lose this phone, a backup is the only way to get your passwords back.';
}

let passwordVisible = false;
function renderView() {
  const entry = findEntry(currentId);
  if (!entry) return;
  passwordVisible = false;
  $('view-avatar').textContent = initial(entry.name);
  $('view-name').textContent = entry.name;
  $('view-updated').textContent = 'Updated ' + formatDate(entry.updated || entry.created);
  $('view-username').textContent = entry.username || 'None';
  $('view-username').classList.toggle('muted', !entry.username);
  $('copy-username-btn').hidden = !entry.username;
  updatePasswordView(entry);
}

function updatePasswordView(entry) {
  $('view-password').textContent = passwordVisible ? entry.password : '••••••••••';
  setIcon($('view-show'), passwordVisible ? 'eye-off' : 'eye');
  $('view-show').querySelector('span').textContent = passwordVisible ? 'Hide' : 'Show';
}

async function renderSettings() {
  const last = await dbGet('lastBackup');
  $('last-backup').textContent = last ? 'Last backup: ' + formatDate(last) : "You haven't made a backup yet.";
  const enabled = !!(await dbGet('biometric'));
  const toggle = $('bio-toggle');
  toggle.checked = enabled;
  toggle.disabled = !canUseBio;
  $('bio-status').textContent = !canUseBio
    ? "This phone or browser can't use fingerprint unlock. Open the app in Chrome and make sure a fingerprint is set up in your phone's settings."
    : enabled ? 'On. Touch the sensor to open the app.' : 'Off. Open the app with a touch instead of typing.';
}

function openEditor(entry) {
  currentId = entry ? entry.id : null;
  $('edit-title').textContent = entry ? 'Edit password' : 'Add password';
  $('edit-name').value = entry ? entry.name : '';
  $('edit-username').value = entry ? entry.username : '';
  const pw = $('edit-password');
  pw.value = entry ? entry.password : '';
  setVisible(pw, false);
  updateStrength(pw);
  setError('edit-error', '');
  go('edit');
  if (!entry) setTimeout(() => $('edit-name').focus(), 50);
}

function resetRestoreFile() {
  $('restore-file').value = '';
  $('restore-file-name').textContent = 'Choose file';
  delete document.querySelector('.file-pick').dataset.chosen;
}

$('restore-file').addEventListener('change', () => {
  const file = $('restore-file').files[0];
  $('restore-file-name').textContent = file ? file.name : 'Choose file';
  if (file) document.querySelector('.file-pick').dataset.chosen = '';
  setError('restore-error', '');
});

// ---------- Forms ----------

$('form-setup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw1 = $('setup-pw1').value;
  const pw2 = $('setup-pw2').value;
  if (pw1.length < MIN_MASTER_LENGTH) return setError('setup-error', `Please use at least ${MIN_MASTER_LENGTH} characters.`);
  if (pw1 !== pw2) return setError('setup-error', "The two passwords don't match. Please type them again.");
  if (!$('setup-confirm').checked) return setError('setup-error', 'Please write your master password down, then tick the box.');
  setError('setup-error', '');

  const button = e.target.querySelector('[type="submit"]');
  busy(button, true);
  try {
    const { key, kdf } = await newVaultKey(pw1);
    vaultKey = key;
    vaultRecord = { format: FORMAT, version: 1, kdf, created: new Date().toISOString() };
    entries = [];
    await saveVault();
    await disableBio();
    requestPersistentStorage();
    clearInputs(['setup-pw1', 'setup-pw2']);
    $('setup-confirm').checked = false;
    await afterUnlock(pw1);
    toast('Your safe is ready');
  } catch (err) {
    console.error(err);
    vaultKey = null;
    setError('setup-error', 'Something went wrong. Please try again.');
  } finally {
    busy(button, false);
  }
});

$('form-unlock').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $('unlock-pw').value;
  if (!pw) return setError('unlock-error', 'Please type your master password.');
  const button = $('unlock-btn');
  busy(button, true);
  try {
    const opened = await openVault(vaultRecord, pw);
    vaultKey = opened.key;
    entries = opened.entries;
    setError('unlock-error', '');
    clearInputs(['unlock-pw']);
    await afterUnlock(pw);
  } catch {
    setError('unlock-error', "That's not the right master password. Check capital letters and try again.");
    $('unlock-pw').select();
  } finally {
    busy(button, false);
  }
});

async function unlockWithBio() {
  const bio = await dbGet('biometric');
  if (!bio || vaultKey) return;
  const button = $('bio-unlock-btn');
  busy(button, true);
  setError('unlock-error', '');
  try {
    let password;
    try {
      const output = await bioEvaluate(fromBase64(bio.credentialId), fromBase64(bio.prfSalt));
      ({ password } = await decryptPayload(await prfToKey(output), bio));
    } catch (err) {
      const message = bioErrorMessage(err);
      if (message) setError('unlock-error', message + ' You can type your master password instead.');
      return;
    }
    try {
      const opened = await openVault(vaultRecord, password);
      vaultKey = opened.key;
      entries = opened.entries;
    } catch {
      // The master password changed since fingerprint was set up.
      await disableBio();
      renderUnlock();
      setError('unlock-error', 'Fingerprint unlock was turned off because your master password changed. Please type it.');
      return;
    }
    await afterUnlock(null);
  } finally {
    busy(button, false);
  }
}

$('bio-unlock-btn').addEventListener('click', unlockWithBio);

$('form-edit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('edit-name').value.trim();
  const username = $('edit-username').value.trim();
  const password = $('edit-password').value;
  if (!name) return setError('edit-error', 'Please type the app or website name.');
  if (!password) return setError('edit-error', 'Please type a password, or tap "Create a strong password for me".');

  const now = new Date().toISOString();
  const existing = findEntry(currentId);
  const before = existing && { ...existing };
  if (existing) {
    Object.assign(existing, { name, username, password, updated: now });
  } else {
    const entry = { id: crypto.randomUUID(), name, username, password, created: now, updated: now };
    entries.push(entry);
    currentId = entry.id;
  }
  try {
    await saveVault();
  } catch (err) {
    console.error(err);
    if (before) Object.assign(existing, before);
    else entries = entries.filter((x) => x.id !== currentId);
    return setError('edit-error', "Couldn't save. Please try again.");
  }
  clearInputs(['edit-name', 'edit-username', 'edit-password']);
  history.back();
  toast('Saved');
});

$('form-change').addEventListener('submit', async (e) => {
  e.preventDefault();
  const oldPw = $('change-old').value;
  const pw1 = $('change-new1').value;
  const pw2 = $('change-new2').value;
  if (pw1.length < MIN_MASTER_LENGTH) return setError('change-error', `Please use at least ${MIN_MASTER_LENGTH} characters for the new password.`);
  if (pw1 !== pw2) return setError('change-error', "The two new passwords don't match.");

  const button = e.target.querySelector('[type="submit"]');
  busy(button, true);
  try {
    try {
      await openVault(vaultRecord, oldPw);
    } catch {
      return setError('change-error', "Your current master password isn't right.");
    }
    const { key, kdf } = await newVaultKey(pw1);
    const previous = { key: vaultKey, record: vaultRecord };
    vaultKey = key;
    vaultRecord = { ...vaultRecord, kdf };
    try {
      await saveVault();
    } catch (err) {
      vaultKey = previous.key;
      vaultRecord = previous.record;
      throw err;
    }
    const hadBio = !!(await dbGet('biometric'));
    await disableBio();
    setError('change-error', '');
    clearInputs(['change-old', 'change-new1', 'change-new2']);
    history.back();
    toast(hadBio
      ? 'Master password changed. Turn fingerprint on again below.'
      : 'Master password changed. Make a new backup.');
  } catch (err) {
    console.error(err);
    setError('change-error', 'Something went wrong. Please try again.');
  } finally {
    busy(button, false);
  }
});

$('form-bio').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $('bio-pw').value;
  if (!pw) return setError('bio-error', 'Please type your master password.');
  const button = $('bio-btn');
  busy(button, true);
  try {
    try {
      await openVault(vaultRecord, pw);
    } catch {
      return setError('bio-error', "That's not the right master password.");
    }
    try {
      await enableBio(pw);
    } catch (err) {
      const message = bioErrorMessage(err);
      if (message) setError('bio-error', message);
      return;
    }
    setError('bio-error', '');
    clearInputs(['bio-pw']);
    history.back();
    toast('Fingerprint unlock is on');
  } finally {
    busy(button, false);
  }
});

$('form-restore').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = $('restore-file').files[0];
  const pw = $('restore-pw').value;
  if (!file) return setError('restore-error', 'Please choose your backup file first.');
  if (!pw) return setError('restore-error', 'Please type the master password for this backup.');

  let record;
  try {
    record = JSON.parse(await file.text());
  } catch {
    record = null;
  }
  if (!isVaultRecord(record)) return setError('restore-error', "That file isn't a Password Safe backup.");

  const button = $('restore-btn');
  busy(button, true);
  try {
    let opened;
    try {
      opened = await openVault(record, pw);
    } catch {
      return setError('restore-error', "That master password doesn't open this backup.");
    }
    if (vaultRecord && !(await ask({
      title: 'Replace your passwords?',
      message: `Everything saved in this app will be replaced with the ${opened.entries.length} passwords in this backup.`,
      confirm: 'Replace',
      danger: true,
    }))) return;
    vaultKey = opened.key;
    entries = opened.entries;
    vaultRecord = { format: FORMAT, version: 1, kdf: record.kdf, created: record.created || new Date().toISOString() };
    await saveVault();
    await disableBio();
    requestPersistentStorage();
    setError('restore-error', '');
    clearInputs(['restore-pw']);
    resetRestoreFile();
    await afterUnlock(pw);
    toast(`Backup restored: ${entries.length} password${entries.length === 1 ? '' : 's'}`);
  } catch (err) {
    console.error(err);
    setError('restore-error', 'Something went wrong. Please try again.');
  } finally {
    busy(button, false);
  }
});

$('search').addEventListener('input', renderList);

$('bio-toggle').addEventListener('change', async (e) => {
  if (e.target.checked) {
    e.target.checked = false; // stays off until it's actually set up
    setError('bio-error', '');
    go('bio');
    setTimeout(() => $('bio-pw').focus(), 50);
  } else {
    await disableBio();
    renderSettings();
    toast('Fingerprint unlock is off');
  }
});

// ---------- Buttons ----------

const actions = {
  back: () => history.back(),
  lock: () => lock({ manual: true }),
  settings: () => go('settings'),
  add: () => openEditor(null),
  edit: () => openEditor(findEntry(currentId)),
  forgot: () => go('forgot'),
  'change-pw': () => { setError('change-error', ''); go('change'); },
  'restore-start': () => { setError('restore-error', ''); go('restore'); },

  'copy-username': (btn) => {
    const entry = findEntry(currentId);
    if (entry) copyText(entry.username, btn, 'Username copied. Now paste it in the other app.');
  },
  'copy-password': (btn) => {
    const entry = findEntry(currentId);
    if (entry) copyText(entry.password, btn, 'Password copied. Now paste it in the other app.');
  },

  generate: () => {
    const input = $('edit-password');
    input.value = generatePassword();
    input.dataset.toggled = '1';
    setVisible(input, true);
    updateStrength(input);
    toast('Strong password created');
  },

  delete: async () => {
    const entry = findEntry(currentId);
    if (!entry) return;
    const ok = await ask({
      title: `Delete ${entry.name}?`,
      message: "The saved username and password will be removed. This can't be undone.",
      confirm: 'Delete',
      danger: true,
    });
    if (!ok) return;
    entries = entries.filter((e) => e.id !== entry.id);
    await saveVault();
    currentId = null;
    history.back();
    toast('Deleted');
  },

  'bio-offer-yes': async (btn) => {
    busy(btn, true);
    try {
      await enableBio(offerPassword);
      toast('Fingerprint unlock is on');
      offerPassword = null;
      $('bio-offer').hidden = true;
    } catch (err) {
      const message = bioErrorMessage(err);
      if (message) {
        toast(message);
        offerPassword = null;
        $('bio-offer').hidden = true;
      }
    } finally {
      busy(btn, false);
    }
  },
  'bio-offer-no': async () => {
    offerPassword = null;
    $('bio-offer').hidden = true;
    await dbSet('bioDeclined', true);
    toast('You can turn it on later in Settings');
  },

  'backup-download': async () => {
    const blob = backupBlob('application/json');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = backupFileName('json');
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    await markBackedUp();
    toast('Backup saved to your Downloads folder');
  },

  'backup-share': async () => {
    // Android's share sheet accepts plain-text files, so the backup is shared as .txt.
    const file = new File([backupBlob('text/plain')], backupFileName('txt'), { type: 'text/plain' });
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
      return actions['backup-download']();
    }
    try {
      await navigator.share({ files: [file], title: 'Password Safe backup' });
      await markBackedUp();
      toast('Backup sent');
    } catch (err) {
      if (err.name !== 'AbortError') toast("Couldn't share. Try Download backup file instead.");
    }
  },

  erase: async () => {
    const ok = await ask({
      title: 'Erase everything?',
      message: "Every password saved in this app will be deleted for good. This can't be undone.",
      confirm: 'Erase everything',
      danger: true,
    });
    if (!ok) return;
    await dbDelete('vault');
    await dbDelete('lastBackup');
    await dbDelete('bioDeclined');
    await disableBio();
    vaultRecord = null;
    vaultKey = null;
    entries = [];
    goBase('setup');
    toast('Everything was erased');
  },
};

document.addEventListener('click', (e) => {
  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn && actions[actionBtn.dataset.action]) {
    actions[actionBtn.dataset.action](actionBtn);
    return;
  }
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    const input = $(toggle.dataset.toggle);
    input.dataset.toggled = '1';
    setVisible(input, input.type === 'password');
  }
});

$('view-show').addEventListener('click', () => {
  const entry = findEntry(currentId);
  if (!entry) return;
  passwordVisible = !passwordVisible;
  updatePasswordView(entry);
});

function backupBlob(type) {
  return new Blob([JSON.stringify(vaultRecord, null, 2)], { type });
}

function backupFileName(ext) {
  return `password-safe-backup-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

async function markBackedUp() {
  await dbSet('lastBackup', new Date().toISOString());
  if (document.body.dataset.screen === 'settings') renderSettings();
}

// ---------- Install & offline ----------

function requestPersistentStorage() {
  // Asks Android not to clear this app's data when storage runs low.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

function setInstallVisible(visible) {
  document.querySelectorAll('.install-btn').forEach((b) => { b.hidden = !visible; });
  document.querySelector('.install-section').hidden = !visible;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  setInstallVisible(true);
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  setInstallVisible(false);
  toast('Installed. Look for Password Safe on your home screen.');
});

document.querySelectorAll('.install-btn').forEach((b) => b.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  setInstallVisible(false);
}));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ---------- Start ----------

(async function start() {
  canUseBio = await bioSupported();
  let stored;
  try {
    stored = await dbGet('vault');
  } catch (err) {
    // Never fall through to the setup screen here: that could overwrite a real vault.
    console.error(err);
    goBase('unlock');
    $('form-unlock').hidden = true;
    $('bio-unlock-btn').hidden = true;
    $('unlock-lead').textContent =
      "Sorry, your saved data couldn't be opened. Please close the app completely and open it again.";
    return;
  }
  vaultRecord = isVaultRecord(stored) ? stored : null;
  goBase(vaultRecord ? 'unlock' : 'setup');
})();
