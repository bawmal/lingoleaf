# Password Safe

A simple password keeper for your Android phone. Your passwords are stored **only on your phone**, locked with one master password.

---

## Step 1: Put the app online (one time, on a computer, about 5 minutes)

The app has to be online once so your phone can install it. After that it works with no internet.

1. On a computer, download this `password-safe` folder.
2. Go to **https://app.netlify.com/drop** and log in. You can use the same Netlify account as your LingoLeaf site.
3. Drag the whole `password-safe` folder onto the page.
4. Netlify gives you a web address like `https://something-random.netlify.app`.
   - Optional: click **Site configuration → Change site name** to pick an easier one, like `my-passwords`.
   - **Do this before installing on your phone.** Changing the address later makes the app start empty, and your fingerprint setting stops working. (Your backup file still works.)
5. Text or email that address to yourself.

Nothing secret is uploaded here. This is just the empty app. Your passwords never leave your phone.

## Step 2: Install it on your Android phone

1. Open the address in **Chrome** on your phone.
2. Tap **"Install this app on my phone"**, or tap the **⋮** menu (top right) → **Install app** / **Add to Home screen**.
3. A **Password Safe** icon appears on your home screen. From now on, open it from there.

## Step 3: Start using it

1. **Create your master password.** Pick something you'll remember, at least 10 characters (three or four random words work well). The app won't accept passwords that are easy to guess. **Write it on paper and keep it somewhere safe at home.**
2. Tap **Add password** to save one: type the app name, your username and the password you already use. Tap **Save**.
3. To use a password later, tap its name, then tap **Copy password** and paste it into the other app (press and hold in the box → Paste).
4. Not sure what password to use for a new account? Tap **Create a strong password for me**.

## Scan passwords from your notebook

Have passwords written on paper? You don't have to type them.

1. On the main screen, tap **Scan**. The camera opens.
2. Take a photo of **one** entry: the app name, username and password. Hold the phone straight above the page, in good light.
3. The app fills in the boxes. **Check each one against your note** before saving, because handwriting is easy to misread (0 and O, 1 and l, 5 and S).
4. If something landed in the wrong box, tap that box, then tap the right words in the list under it.
5. Tap **Save**, then **Scan next** to carry on through your notebook.

Writing it as `User: ...` and `Password: ...` helps, but plain lines work too, in the order app name, username, password. The photo is read on your phone and is never sent anywhere or saved. The first scan needs internet to download the reader (about 6 MB); after that it works offline.

## Fingerprint unlock

- After you type your master password, the app asks **"Use your fingerprint next time?"**. Tap **Turn on** and touch the sensor.
- From then on, opening the app asks for your fingerprint straight away. You can still type your master password any time.
- Turn it on or off in **Settings → Fingerprint**.
- If you change your master password, the app asks for one fingerprint touch to keep fingerprint unlock working.
- Your phone needs a fingerprint set up (Android **Settings → Security**) and an up-to-date Chrome.

## Keep a backup (important!)

If you lose your phone or delete the app, your passwords go with it, unless you have a backup.

- Open **⚙︎ Settings → Send backup to email or Google Drive**, and send it to your email or Google Drive.
- Do this every month or so, and whenever you add important passwords. The app reminds you.
- The backup file is locked with your master password, so it's useless to anyone else.

**New phone?** Install the app (Step 2), tap **"I have a backup file from before"**, choose the file, and type the master password you were using when you made it.

## If you forget your master password

Nobody can reset it, by design. Try these in order:

1. **Your paper note.** That's why the app asks you to write it down.
2. **Your fingerprint.** If fingerprint unlock is on, tap **Forgot your master password? → Show my master password** and touch the sensor. Write it down again.
3. **A backup file**, plus the master password you were using when you made it.
4. **Start over.** Erase everything, then use each website's own "Forgot password?" link to reset your accounts.

## Good to know

- The app **locks itself** after 2 minutes without use, or when you leave it for more than 30 seconds. Tap 🔒 to lock it right away.
- Clearing Chrome's data or uninstalling the app also deletes your passwords. Keep your backup up to date.

---

## Technical notes

- Plain HTML/CSS/JS installable web app (PWA); no build step, no server, no network calls. A service worker caches the files so the app works offline.
- The vault is encrypted with **AES-256-GCM**. The key is derived from the master password with **PBKDF2-SHA256, 600,000 iterations**, random 16-byte salt, and a fresh 12-byte IV on every save. Neither the master password nor the key is stored.
- Encrypted data lives in IndexedDB. The app asks for persistent storage so Android won't evict it.
- The backup file is the same encrypted record as JSON.
- Fingerprint unlock: a platform passkey with the WebAuthn **PRF** extension. The PRF output (HKDF-SHA256) becomes an AES-GCM key that encrypts a copy of the master password, stored in IndexedDB. The secret only comes out of the phone's secure hardware after a fingerprint check. If PRF isn't supported, the option stays off. Changing the master password re-seals it with one touch; restoring a backup or erasing everything turns it off. The passkey is tied to the site's domain.
- Icons: Lucide (ISC). Font: Inter (OFL, `fonts/LICENSE-Inter.txt`), bundled so the app works offline.
- Scan from paper: on-device OCR with Tesseract.js 5 (Apache-2.0, `ocr/`), English LSTM model (best_int). Loaded only when first used and kept in a separate service-worker cache (`password-safe-ocr-v1`) so app updates don't re-download it. CSP allows `'wasm-unsafe-eval'` for this. The photo stays in memory as a blob URL and is discarded on save, cancel or lock; the OCR worker is stopped on lock.
- Security hardening (Oct 2026 review): master password needs 10+ characters and a non-"Weak" score; backups are rejected if their key-derivation settings are weaker than 100k iterations or salt < 16 bytes, and restored vaults are re-encrypted with fresh settings; a lock during a slow task (e.g. changing the master password) cancels it; copied passwords are cleared from the clipboard after 45 seconds if you're still in the app; revealed passwords re-hide and the page blurs when the app loses focus (recent-apps thumbnail).
- Known limits: copied passwords can remain in Gboard's clipboard history; a web app can't block screenshots; the phone's screen-lock PIN can stand in for the fingerprint; anyone holding the phone can erase the safe (nothing is revealed).
- A strict Content-Security-Policy is set in `index.html` and `_headers`.
- When you change any app file, bump `CACHE` in `sw.js` so installed copies update.
- This folder is blocked from the LingoLeaf site by a rule in the root `_redirects`. Deploy it as its own Netlify site.
