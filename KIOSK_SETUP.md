# Kiosk Mode setup (Pak & Send tablet)

The tablet stands in a public place, so the app locks itself in with Android **Lock Task Mode**.
For a lock that customers cannot break out of, the app must be the tablet's **Device Owner**.

- App package: `dk.pakogsend.app`
- Device admin receiver: `expo.modules.kiosk.KioskAdminReceiver`
- Exit code: `0088` (one constant: `KIOSK_EXIT_CODE` in `mobile/src/lib/kiosk.tsx`)

## 1. Make the app Device Owner (one time per tablet)

Device Owner can only be set on a tablet with **no Google, Samsung or other accounts** on it. The
easiest way is right after a factory reset: go through setup, **skip** adding any account, and do not
sign in to anything.

1. Enable Developer options (tap *Build number* 7 times) and turn on **USB debugging**.
2. Install the app from the download page (or `adb install -r pak-and-send-native.apk`).
3. Pair the Zebra label printer and set up the Wi-Fi **before** locking the tablet. Bluetooth and
   Wi-Fi settings cannot be reached once kiosk mode is on.
4. Run:

   ```
   adb shell dpm set-device-owner dk.pakogsend.app/expo.modules.kiosk.KioskAdminReceiver
   ```

   Success prints `Success: Device owner set to package ...`.
   If it fails with "already some accounts on the device", remove every account (or factory reset)
   and try again.

## 2. Turn kiosk mode on

1. Open the app, menu (burger) → **Settings** → enter the settings code → sign in.
2. Settings → **Kiosk Mode** shows `Device Owner: Yes`. If it shows the red warning
   *Not Device Owner – kiosk mode is not secure*, step 1 was not completed; the app then falls back to
   ordinary screen pinning, which a customer can leave.
3. Switch **Start in Kiosk Mode after restart** on if the tablet should always come back locked after a
   power cut or restart.
4. Go back to the booking screen → menu → **Activate Kiosk Mode**.

While active: no Home, Recent apps, notification bar or Settings; Back only steps back inside the app;
the screen stays on while charging; after 3 minutes without a touch the customer is asked "Are you
still there?" and after 10 more seconds the form is cleared and the app returns to step 1.

## 3. Leave kiosk mode

Menu → **Disable Kiosk Mode** → enter `0088`. Five wrong codes block the pad for 60 seconds.

Settings → Kiosk Mode → **Kiosk Mode feature: Disabled** turns the feature off completely (kiosk is
exited, the menu item is hidden, nothing starts automatically).

## 4. Updating the app

`adb install -r <apk>` or install from the download page. A Device Owner app can only be updated with a
package signed by the **same key**; every release is built through the same EAS credentials, so keep
using the same Expo account/project. After an update the app re-enters kiosk mode on its own when
*Start in Kiosk Mode after restart* is on (or kiosk was active before the update).

## 5. Removing Device Owner

Preferred: Settings → Kiosk Mode → **Remove Device Owner** (asks for the code and confirms).

Without a working app, a non-test Device Owner can only be removed by a **factory reset**, so always
remove it from inside the app before uninstalling or handing the tablet back.

## 6. Test checklist

- Home, Recent apps and the notification bar do nothing while kiosk is on.
- Wrong code shows an error; right code (`0088`) exits; 5 wrong codes lock the pad for 60 s.
- Burger menu item toggles between *Activate* and *Disable*; hidden when the feature is Disabled.
- Tap Email / Phone on the sender and receiver pages: the field and the Back/Continue bar stay above
  the keyboard, both with kiosk on and off.
- Restart and power off/on with *Start in Kiosk Mode after restart* ON (app opens locked) and OFF
  (normal launcher).
- Leave a half-filled form for 3 minutes: prompt, then reset to step 1.

## 7. iPad and iPhone (Guided Access)

iOS has no Device Owner. The app uses Apple's **Guided Access** instead, which locks the device into
one app until a passcode is entered. The app follows it: while Guided Access is on, the screen stays
on and the "Are you still there?" reset works as on Android. (How to install the iOS app:
`docs/IOS_APP_STORE.md`.)

### Set up once per iPad

1. Pair the Zebra printer in the app (menu → Settings → settings code → **Printer** tab) and allow
   Bluetooth when iOS asks.
   Set up Wi-Fi too. Both are hard to reach once the iPad is locked.
2. iPad Settings → **Accessibility → Guided Access** → turn it on. Under **Passcode Settings** choose a
   Guided Access passcode (staff only). Optionally turn off **Display Auto-Lock** there, or set
   Settings → Display & Brightness → Auto-Lock to Never.
3. Settings → Accessibility → **Accessibility Shortcut** → tick **Guided Access** (so a triple-click
   always starts it).

### Lock and unlock

- **Lock:** open the app's booking screen, **triple-click the side button** (the Home button on iPads
  that have one) and tap **Start**. The app's menu item *Activate Kiosk Mode* shows these steps.
- **Unlock:** triple-click again, enter the Guided Access passcode and end it.
- Settings → Kiosk Mode in the app shows *Guided Access active now: Yes/No*.

### Supervised iPads (optional, with Apple Configurator or an MDM)

On a supervised iPad whose profile allows **Autonomous Single App Mode** for `dk.pakogsend.app`, the
app locks and unlocks itself from the menu (unlock with the exit code `0088`, same as Android). With
**Single App Mode** pushed from Apple Configurator or an MDM, the iPad also starts straight into the app
after a restart. Without supervision, iOS can't open an app by itself after a restart.

### Test checklist (iPad)

- Triple-click → Start: Home gesture, Control Center and notifications do nothing.
- Settings → Kiosk Mode shows *Guided Access active now: Yes* within a couple of seconds.
- Leave a half-filled form for 3 minutes while locked: prompt, then reset to step 1.
- Print a label (Bluetooth printer) while locked.
