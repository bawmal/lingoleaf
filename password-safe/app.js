'use strict';

// Password Safe: everything stays on this device.
// The vault is encrypted with AES-256-GCM using a key derived from the
// master password with PBKDF2-SHA256. The master password and the key are
// never stored; only the encrypted vault, its salt and IV are saved.

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
  const iv = crypto.getRandomValues(new Uint8Array(12));
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
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const kdf = { name: 'PBKDF2-SHA256', iterations: PBKDF2_ITERATIONS, salt: toBase64(salt) };
  return { key, kdf };
}

// ---------- Password generator ----------

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

// ---------- App state ----------

let vaultKey = null;      // CryptoKey while unlocked, null when locked
let vaultRecord = null;   // encrypted record as stored
let entries = [];         // decrypted entries while unlocked
let currentId = null;     // entry being viewed / edited
let lastActivity = Date.now();
let hiddenAt = null;
let installPrompt = null;

const LOCKED_SCREENS = ['setup', 'unlock', 'forgot', 'restore'];
const UNLOCKED_SCREENS = ['list', 'view', 'edit', 'settings', 'change', 'restore'];

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
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
}

function setError(id, message) {
  $(id).textContent = message || '';
}

function clearInputs(ids) {
  ids.forEach((id) => {
    const el = $(id);
    el.value = '';
    if (el.dataset.wasPassword) el.type = 'password';
  });
  document.querySelectorAll('.btn-show').forEach((b) => {
    const input = $(b.dataset.toggle);
    if (input.type === 'password') b.textContent = 'Show';
  });
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    toast("Sorry, couldn't copy. Tap Show and type it instead.");
  }
}

function busy(button, isBusy, label) {
  if (isBusy) {
    button.dataset.label = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// ---------- Locking ----------

function lock() {
  vaultKey = null;
  entries = [];
  currentId = null;
  clearInputs(['unlock-pw', 'edit-name', 'edit-username', 'edit-password',
    'change-old', 'change-new1', 'change-new2', 'restore-pw', 'search']);
  $('restore-file').value = '';
  $('view-password').textContent = '';
  $('view-username').textContent = '';
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
  } else {
    if (vaultKey && hiddenAt && Date.now() - hiddenAt > AWAY_LOCK_MS) lock();
    else if (vaultKey && Date.now() - lastActivity > AUTO_LOCK_MS) lock();
    hiddenAt = null;
  }
});

// ---------- Screens ----------

const renderers = {
  list: renderList,
  view: renderView,
  settings: renderSettings,
  unlock: () => setTimeout(() => $('unlock-pw').focus(), 50),
};

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
    avatar.textContent = (entry.name.trim()[0] || '?').toUpperCase();

    const text = document.createElement('span');
    text.className = 'entry-text';
    const name = document.createElement('div');
    name.className = 'entry-name';
    name.textContent = entry.name;
    const user = document.createElement('div');
    user.className = 'entry-user';
    user.textContent = entry.username || 'No username';
    text.append(name, user);

    const chev = document.createElement('span');
    chev.className = 'chev';
    chev.textContent = '›';

    btn.append(avatar, text, chev);
    li.append(btn);
    list.append(li);
  }

  $('empty').hidden = entries.length > 0;
  $('search').hidden = entries.length === 0;
  $('no-results').hidden = entries.length === 0 || shown.length > 0;
  renderBackupBanner();
}

async function renderBackupBanner() {
  const last = await dbGet('lastBackup');
  const days = last ? (Date.now() - new Date(last).getTime()) / 86400000 : Infinity;
  $('backup-banner').hidden = !(entries.length >= 3 && days > BACKUP_REMINDER_DAYS);
}

let passwordVisible = false;
function renderView() {
  const entry = findEntry(currentId);
  if (!entry) return;
  passwordVisible = false;
  $('view-name').textContent = entry.name;
  $('view-username').textContent = entry.username || '(none)';
  document.querySelector('[data-action="copy-username"]').hidden = !entry.username;
  updatePasswordView(entry);
}

function updatePasswordView(entry) {
  $('view-password').textContent = passwordVisible ? entry.password : '••••••••••';
  $('view-show').textContent = passwordVisible ? 'Hide' : 'Show';
}

async function renderSettings() {
  const last = await dbGet('lastBackup');
  $('last-backup').textContent = last ? 'Last backup: ' + formatDate(last) : "You haven't made a backup yet.";
}

function openEditor(entry) {
  currentId = entry ? entry.id : null;
  $('edit-title').textContent = entry ? 'Edit password' : 'Add password';
  $('edit-name').value = entry ? entry.name : '';
  $('edit-username').value = entry ? entry.username : '';
  $('edit-password').value = entry ? entry.password : '';
  $('edit-password').type = 'password';
  document.querySelector('[data-toggle="edit-password"]').textContent = 'Show';
  setError('edit-error', '');
  go('edit');
  if (!entry) setTimeout(() => $('edit-name').focus(), 50);
}

// ---------- Forms ----------

$('form-setup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw1 = $('setup-pw1').value;
  const pw2 = $('setup-pw2').value;
  if (pw1.length < MIN_MASTER_LENGTH) return setError('setup-error', `Please use at least ${MIN_MASTER_LENGTH} characters.`);
  if (pw1 !== pw2) return setError('setup-error', "The two passwords don't match. Please type them again.");
  if (!$('setup-confirm').checked) return setError('setup-error', 'Please write your master password down, then tick the box.');
  setError('setup-error', '');

  const button = e.submitter || e.target.querySelector('[type="submit"]');
  busy(button, true, 'Creating…');
  try {
    const { key, kdf } = await newVaultKey(pw1);
    vaultKey = key;
    vaultRecord = { format: FORMAT, version: 1, kdf, created: new Date().toISOString() };
    entries = [];
    await saveVault();
    requestPersistentStorage();
    clearInputs(['setup-pw1', 'setup-pw2']);
    $('setup-confirm').checked = false;
    noteActivity();
    goBase('list');
    toast('Your safe is ready!');
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
  busy(button, true, 'Unlocking…');
  try {
    const opened = await openVault(vaultRecord, pw);
    vaultKey = opened.key;
    entries = opened.entries;
    setError('unlock-error', '');
    clearInputs(['unlock-pw']);
    noteActivity();
    goBase('list');
  } catch {
    setError('unlock-error', "That's not the right master password. Check capital letters and try again.");
    $('unlock-pw').select();
  } finally {
    busy(button, false);
  }
});

$('form-edit').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('edit-name').value.trim();
  const username = $('edit-username').value.trim();
  const password = $('edit-password').value;
  if (!name) return setError('edit-error', 'Please type the app or website name.');
  if (!password) return setError('edit-error', 'Please type a password, or tap "Make a strong password for me".');

  const now = new Date().toISOString();
  const existing = findEntry(currentId);
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

  const button = e.submitter || e.target.querySelector('[type="submit"]');
  busy(button, true, 'Changing…');
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
    setError('change-error', '');
    clearInputs(['change-old', 'change-new1', 'change-new2']);
    history.back();
    toast('Master password changed. Remember to make a new backup.');
  } catch (err) {
    console.error(err);
    setError('change-error', 'Something went wrong. Please try again.');
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
  busy(button, true, 'Restoring…');
  try {
    let opened;
    try {
      opened = await openVault(record, pw);
    } catch {
      return setError('restore-error', "That master password doesn't open this backup.");
    }
    if (vaultRecord && !confirm('Replace everything saved in this app with this backup?')) return;
    vaultKey = opened.key;
    entries = opened.entries;
    vaultRecord = { format: FORMAT, version: 1, kdf: record.kdf, created: record.created || new Date().toISOString() };
    await saveVault();
    requestPersistentStorage();
    setError('restore-error', '');
    clearInputs(['restore-pw']);
    $('restore-file').value = '';
    noteActivity();
    goBase('list');
    toast(`Backup restored: ${entries.length} password${entries.length === 1 ? '' : 's'}`);
  } catch (err) {
    console.error(err);
    setError('restore-error', 'Something went wrong. Please try again.');
  } finally {
    busy(button, false);
  }
});

$('search').addEventListener('input', renderList);

// ---------- Buttons ----------

const actions = {
  back: () => history.back(),
  lock,
  settings: () => go('settings'),
  add: () => openEditor(null),
  edit: () => openEditor(findEntry(currentId)),
  forgot: () => go('forgot'),
  'change-pw': () => { setError('change-error', ''); go('change'); },
  'restore-start': () => { setError('restore-error', ''); go('restore'); },

  'copy-username': () => {
    const entry = findEntry(currentId);
    if (entry) copyText(entry.username, 'Username copied. You can now paste it.');
  },
  'copy-password': () => {
    const entry = findEntry(currentId);
    if (entry) copyText(entry.password, 'Password copied. You can now paste it.');
  },

  generate: () => {
    const input = $('edit-password');
    input.value = generatePassword();
    input.type = 'text';
    document.querySelector('[data-toggle="edit-password"]').textContent = 'Hide';
    toast('Strong password created');
  },

  delete: async () => {
    const entry = findEntry(currentId);
    if (!entry || !confirm(`Delete the password for "${entry.name}"? This can't be undone.`)) return;
    entries = entries.filter((e) => e.id !== entry.id);
    await saveVault();
    currentId = null;
    history.back();
    toast('Deleted');
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
      if (err.name !== 'AbortError') toast("Couldn't share. Try \"Download backup file\" instead.");
    }
  },

  erase: async () => {
    if (!confirm('Erase ALL saved passwords from this app? This cannot be undone.')) return;
    if (!confirm('Are you completely sure? Everything will be deleted.')) return;
    await dbDelete('vault');
    await dbDelete('lastBackup');
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
    actions[actionBtn.dataset.action]();
    return;
  }
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    const input = $(toggle.dataset.toggle);
    input.dataset.wasPassword = '1';
    input.type = input.type === 'password' ? 'text' : 'password';
    toggle.textContent = input.type === 'password' ? 'Show' : 'Hide';
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

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  document.querySelectorAll('.install-btn').forEach((b) => { b.hidden = false; });
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  document.querySelectorAll('.install-btn').forEach((b) => { b.hidden = true; });
  toast('Installed! Look for Password Safe on your home screen.');
});

document.querySelectorAll('.install-btn').forEach((b) => b.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  document.querySelectorAll('.install-btn').forEach((x) => { x.hidden = true; });
}));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ---------- Start ----------

(async function start() {
  let stored;
  try {
    stored = await dbGet('vault');
  } catch (err) {
    // Never fall through to the setup screen here: that could overwrite a real vault.
    console.error(err);
    goBase('unlock');
    $('form-unlock').hidden = true;
    $('screen-unlock').querySelector('.lead').textContent =
      "Sorry, your saved data couldn't be opened. Please close the app completely and open it again.";
    return;
  }
  vaultRecord = isVaultRecord(stored) ? stored : null;
  goBase(vaultRecord ? 'unlock' : 'setup');
})();
