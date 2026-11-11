# Working on the app from any computer

This file is for anyone who continues work on this project: the owner on a new computer, another developer, or a new Claude Code chat. Everything needed is in this GitHub repo, except passwords and keys (see "Secrets").

Claude Code's memory and chat history stay on the computer they were made on. Anything a later chat must know goes in this file or in `CLAUDE.md`, and gets pushed to GitHub.

## What is in this repo

- `/` (root): the server and the web admin (Next.js). Live at https://app.pakogsend.dk.
- `mobile/`: the shop tablet app for Android, iPhone and iPad (Expo).
- `CLAUDE.md`: the permanent rules for the app. Read them before any change.
- `KIOSK_SETUP.md`: setting up a shop tablet (kiosk lock, printer).
- `docs/IOS_APP_STORE.md`: the iPhone/iPad version and the App Store.

## Accounts

| Service | Account | Used for |
| --- | --- | --- |
| GitHub | `chrjensen55-hub`, repo `chrjensen55-hub/shipmondo`, branch `master` | The code, and the app versions the tablets download |
| Vercel | Team `shipmondo`, project `shipmondo` | Runs the server. Deploys by itself when `master` changes |
| Expo | Organization `pakogsend` (owner login `shipmondo`), project `pak-and-send` | Building new app versions |
| Shipmondo | Sandbox account for tests; each shop's live account is entered on its tablets | Prices, bookings and labels |
| Apple Developer | Not set up yet | iPhone/iPad, see `docs/IOS_APP_STORE.md` |

Always build the app with the Expo organization `pakogsend`, project `pak-and-send`. Its Android signing key is stored at Expo, and a kiosk tablet only accepts updates signed with that same key. A build from another Expo account or project can't update the tablets.

## Start on a new computer

1. Install Git, Node.js (LTS; the project was last built with Node 24), the GitHub CLI (`gh`), and VS Code with the Claude Code extension.
2. Get the code and its packages:
   ```bash
   git clone https://github.com/chrjensen55-hub/shipmondo.git
   cd shipmondo
   npm install
   cd mobile
   npm install
   ```
3. Log in:
   - GitHub: `gh auth login` as `chrjensen55-hub`, or with your own account (see "Another person"). Needed to push changes and publish app versions.
   - Git: set your name and email, `git config user.name "chrjensen55-hub"` and `git config user.email "318182071+chrjensen55-hub@users.noreply.github.com"` (or your own).
   - Expo: `npx eas-cli login` as `shipmondo`. Only needed to build a new app version.
   - Vercel: no login needed for normal work.
4. In the root folder, copy `.env.example` to `.env` and fill it in:
   - `SHIPMONDO_API_USERNAME`, `SHIPMONDO_API_KEY`: the Shipmondo **sandbox** API user and key (sandbox → Settings → API access). `SHIPMONDO_API_BASE_URL=https://sandbox.shipmondo.com/api/public/v3`, `SHIPMONDO_MOCK_MODE=false`. Without sandbox keys, keep `SHIPMONDO_MOCK_MODE=true`.
   - `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`: any values you choose, for logging in to `/admin` on your own computer. `AUTH_SECRET` is a long random text.
   - `DATABASE_URL`: not used yet, leave it empty.
5. Open the folder in VS Code, start a new Claude Code chat and say what you want. Claude reads `CLAUDE.md` and this file by itself.

No computer at hand? Claude Code on the web (claude.ai/code) can also open this GitHub repo. That's fine for code changes. Build new app versions from a computer with the Expo login.

## Every time you start and finish

- Before you change anything: `git pull`. Another computer or person may have pushed changes.
- When you are done: commit and push to `master`. Then the next computer starts from the latest version.

## Another person

- GitHub: repo → Settings → Collaborators → Add people, with write access. Needed to push changes and publish app versions.
- Expo: expo.dev → organization `pakogsend` → Members → invite. Only needed to build app versions.
- Vercel: team `shipmondo` → Members. Needed to change server settings or read server logs, and if Vercel blocks deploys from their commits.
- Any Claude Code account works. The code, rules and guides all come from GitHub.

## Secrets (never in GitHub)

- `.env`: sandbox keys and a local admin login, for tests on your own computer only.
- Each shop's live Shipmondo keys and its Danadresse key are entered on the tablet (Admin → Settings) and sent to the server with each request.
- The server's own settings (admin login and so on) are in Vercel → project `shipmondo` → Settings → Environment Variables. The Shipmondo values there are marked Sensitive and can't be read back.
- The Android signing key and the iOS certificates are stored at Expo. For an extra backup, download the Android keystore once with `npx eas-cli credentials --platform android` and keep it in a password manager.
- The App Store Connect key (`.p8` file) is kept outside the repo, see `docs/IOS_APP_STORE.md`.
- The `apk/` folder (the old Google Play web-app package `dk.pakogsend.app.twa` and its signing key) exists only on the original Windows PC. If that app is on Google Play, back the folder up somewhere safe.
- Keep passwords and keys in a password manager, not in code, commits or chat messages.

## How a change goes live

**Server or web admin** (`src/`, `public/`):
1. Commit and push to `master`.
2. Vercel deploys https://app.pakogsend.dk within a few minutes. The commit gets a green tick on GitHub when it's live.
3. The tablets use the new server right away. No new app version is needed.

**Tablet app** (`mobile/`): needs a new app version.
1. If the change also needs the server, push that first and wait until it's live.
2. Raise `expo.version` in `mobile/app.json`, for example `1.8.0` → `1.9.0`. The version and the release tag must match.
3. Build: `cd mobile`, then `npx eas-cli build --platform android --profile preview --non-interactive`.
4. Download the APK from the build page, name it `pak-and-send-native.apk`, and publish it:
   `gh release create mobile-v1.9.0 pak-and-send-native.apk --title "Pak & Send — Native Android App v1.9.0" --notes "<what changed>"`
5. Delete the oldest release so exactly 5 are left (rule 1 in `CLAUDE.md`): `gh release delete mobile-vX.Y.Z --cleanup-tag --yes`.
6. On each tablet, open the download page https://app.pakogsend.dk/admin/settings/app (staff login) and install the Latest Version.

iPhone and iPad get new versions through TestFlight or the App Store instead, see `docs/IOS_APP_STORE.md`.

## Checks before a release

- Root: `npm run lint`, `npm test`, `npm run build`.
- App: in `mobile/`, `npx tsc --noEmit` and `npx expo lint`.
- The testing checklist at the end of `CLAUDE.md`.
- Test bookings only with the Shipmondo sandbox, never with a shop's live account.

## Good to know

- The GitHub repo is public: anyone can read the code, only collaborators can change it. It contains no passwords. The download page reads the releases without a login, so making the repo private would break tablet updates until the page gets a GitHub token.
- The owner chose the delivery options per carrier: PostNord and GLS have Service point, Home and Business; Bring and dao have Service point and Home. Business uses the Home price. The Shipmondo product for each option is in `src/lib/shipmondo/quotes.ts` (`PRODUCTS_BY_DELIVERY`). The options the app shows are in `mobile/src/lib/wizard-context.tsx` (`DELIVERY_OPTIONS`) and, for the web wizard, `src/components/customer/send-wizard.tsx` (`BUSINESS_CARRIERS`). Change them together.
- City from postal code: since 5 Oct 2026 each tablet sends its own Danadresse key (Admin → Settings), and a postal code list bundled with the server is the backup. The server doesn't use a `DANADRESSE_API_KEY` any more, although rule 2 in `CLAUDE.md` still mentions it.
