# Strength & Mobility

Your 12-week plan and training log as an app on your iPhone. It installs from Safari onto your home screen, opens full screen like any other app, works offline at the gym, and keeps your log on your phone. Everything below is free.

## What's inside

- **Plan**: Day A, B and C with the step pictures, plus the daily desk reset.
- **Log**: record each visit. Rows fill in from the plan and your last weights, so you only change what was different.
- **Progress**: a chart per exercise and a clear "stay" or "go up" call based on the two-sessions-in-a-row rule.
- **Guide**: the how-hard, shaking and cracking notes, and backup and restore for your log.

## Put it online (free, about 10 minutes, on your Mac)

The app has to live at a web address for your iPhone to install it. GitHub Pages hosts it for free.

1. Unzip `strength-app.zip`. You'll get a folder called `strength-app`.
2. Make a free account at [github.com/signup](https://github.com/signup).
3. Click **+** (top right) → **New repository**. Name it `strength-app`, choose **Public**, then **Create repository**.
   Public is required for free hosting. Only the app's code goes here. Your workout log never leaves your phone.
4. On the new repository page, click **uploading an existing file**. Open the `strength-app` folder on your Mac, select everything inside it (Cmd+A) and drag it into the browser window. Wait for the uploads to finish, then click **Commit changes**.
5. Go to **Settings** → **Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, **Branch** to `main` and the folder to `/ (root)`, then **Save**.
6. After a minute or two, the page shows your address. It looks like `https://YOUR-USERNAME.github.io/strength-app/`.

## Install it on your iPhone 15 Pro

1. Open that address in **Safari**.
2. Tap the **Share** button. On iOS 26, tap the **•••** button next to the address bar first, then **Share**.
3. Scroll down and tap **Add to Home Screen**. If you see **Open as Web App**, leave it switched on. Tap **Add**.
4. Open **Strength** from your home screen. That's the app. Use the icon from now on, not Safari, because the app keeps its own copy of your log.

It works offline after the first open, which helps in gyms with poor signal.

## Keep your log safe

Your visits are stored only inside the app on your phone. Deleting the home screen icon deletes them too.

Every couple of weeks: **Guide** tab → **Back up my log** → **Save to Files** → **iCloud Drive**. iCloud's free 5 GB is plenty. To bring a backup back (new phone, reinstall), use **Restore a backup** on the same screen.

## Updating the app later

1. Change the files (yourself, with Claude Code, or by asking Claude in chat).
2. In `sw.js`, change `VERSION` (for example `sm-v1` to `sm-v2`). Without this, phones keep showing the old version.
3. On GitHub, open the repository → **Add file** → **Upload files**, drag in the changed files and commit.
4. On your iPhone, close the app fully and open it again. Do this twice if the change doesn't show the first time.

Your log isn't affected by updates.

## Trying it on your Mac first

Open Terminal, then:

```
cd ~/Downloads/strength-app
python3 -m http.server 8000
```

Visit `http://localhost:8000` in Safari or Chrome. Press Ctrl+C in Terminal to stop.

## Handing it to Claude Code

`CLAUDE.md` is the brief Claude Code reads automatically. Open Terminal in the `strength-app` folder, start Claude Code with `claude`, and paste:

> Read CLAUDE.md, run the app locally and check it works at iPhone size in light and dark mode. Then tell me what you'd improve first from the roadmap, and wait for my go-ahead before changing anything.

## Why not a "proper" App Store app?

A native iPhone app needs Xcode, and without Apple's paid developer membership an app you install on your own phone stops opening after 7 days until you reinstall it from your Mac. App Store and TestFlight distribution need the paid membership. A home screen web app has none of those limits, costs nothing and updates instantly.

## Folder map

```
index.html             app shell and screens
css/app.css            styles, light and dark
js/plan.js             plan content and illustrations
js/app.js              logging, progress, backups, navigation
sw.js                  offline support (bump VERSION on every change)
manifest.webmanifest   home screen name, icon and colours
icons/                 app icons
reference/             the original plan designs and the first log page
CLAUDE.md              brief for Claude Code
```

General guidance for a healthy adult, not medical advice.
