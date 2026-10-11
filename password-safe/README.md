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
5. Text or email that address to yourself.

Nothing secret is uploaded here. This is just the empty app. Your passwords never leave your phone.

## Step 2: Install it on your Android phone

1. Open the address in **Chrome** on your phone.
2. Tap **"Install this app on my phone"**, or tap the **⋮** menu (top right) → **Install app** / **Add to Home screen**.
3. A **Password Safe** icon appears on your home screen. From now on, open it from there.

## Step 3: Start using it

1. **Create your master password.** Pick something you'll remember, at least 8 characters. **Write it on paper and keep it somewhere safe at home.**
2. Tap **+ Add** to save a password: type the app name, your username and the password. Tap **Save**.
3. To use a password later, tap its name, then tap **Copy password** and paste it into the other app (press and hold in the box → Paste).
4. Not sure what password to use for a new account? Tap **Make a strong password for me**.

## Keep a backup (important!)

If you lose your phone or delete the app, your passwords go with it, unless you have a backup.

- Open **⚙︎ Settings → Send backup to email or Google Drive**, and send it to your email or Google Drive.
- Do this every month or so, and whenever you add important passwords. The app reminds you.
- The backup file is locked with your master password, so it's useless to anyone else.

**New phone?** Install the app (Step 2), tap **"I have a backup file from before"**, choose the file, and type the master password you were using when you made it.

## Good to know

- The app **locks itself** after 2 minutes without use, or when you leave it for more than 30 seconds. Tap 🔒 to lock it right away.
- **Forgot your master password?** Nobody can unlock it, by design. You can restore a backup (you'll need the master password from back then) or erase everything and start fresh.
- Clearing Chrome's data or uninstalling the app also deletes your passwords. Keep your backup up to date.

---

## Technical notes

- Plain HTML/CSS/JS installable web app (PWA); no build step, no server, no network calls. A service worker caches the files so the app works offline.
- The vault is encrypted with **AES-256-GCM**. The key is derived from the master password with **PBKDF2-SHA256, 600,000 iterations**, random 16-byte salt, and a fresh 12-byte IV on every save. Neither the master password nor the key is stored.
- Encrypted data lives in IndexedDB. The app asks for persistent storage so Android won't evict it.
- The backup file is the same encrypted record as JSON.
- A strict Content-Security-Policy is set in `index.html` and `_headers`.
- When you change any app file, bump `CACHE` in `sw.js` so installed copies update.
- This folder is blocked from the LingoLeaf site by a rule in the root `_redirects`. Deploy it as its own Netlify site.
