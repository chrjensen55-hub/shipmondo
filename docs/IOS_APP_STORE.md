# iOS version (iPhone and iPad) and the App Store

Status on 10 Nov 2026: the app in `mobile/` is ready for iOS. It is the same app as the Android version (v1.8.0, bundle ID `dk.pakogsend.app`, Expo project `pakogsend/pak-and-send`). A test build for the iOS Simulator is on Expo (see "Builds" below). A build that can be installed on a real iPhone/iPad, or sent to the App Store, needs the Apple Developer account first.

## What is different on iPhone and iPad

| | Android | iPhone / iPad |
| --- | --- | --- |
| Kiosk lock | Device Owner + Lock Task (see `KIOSK_SETUP.md`) | Apple's **Guided Access** (see `KIOSK_SETUP.md`, iPad section) |
| Start kiosk | Menu → Activate Kiosk Mode | Triple-click the side button → Start. On a *supervised* iPad the menu does it. |
| Leave kiosk | Menu → code `0088` | Triple-click → Guided Access passcode. On a supervised iPad: menu → `0088`. |
| Start after restart | Setting in the app | Only with Single App Mode from Apple Configurator or an MDM |
| Printer | Zebra over Bluetooth LE | The same. iOS asks once for Bluetooth access: tap Allow. |
| Install / update | APK from the download page | TestFlight, App Store, or an install link (ad hoc), never an APK |

Everything else (booking flow, prices per location, Shipmondo, labels, Refresh/Exit, languages) is shared code and works the same.

## What I need from you

1. **Apple Developer Program membership**: https://developer.apple.com/programs/enroll/ (99 USD per year).
   - Enrol as an *organisation* (Courier Copenhagen ApS) so the App Store shows the company name. This needs a D-U-N-S number for the company (free, can take a few days to get). An individual account is faster, but then your own name is shown as the seller.
2. **App Store Connect API key**, so I can build and upload without your password or 2FA codes:
   - App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → **Generate API Key**, access **Admin**.
   - Send me the **Key ID** and **Issuer ID**, and save the downloaded `AuthKey_XXXXXXXXXX.p8` file to `C:\Users\kedde\.pakogsend\` (it can only be downloaded once; never put it in git).
   - Also the **Team ID** (developer.apple.com → Account → Membership details).
3. **Create the app record once** (Apple only allows this with a normal login): App Store Connect → Apps → **+** → New App → platform iOS, name (see below), primary language Danish, bundle ID `dk.pakogsend.app` (if it isn't in the list yet, tell me; I register it with the API key first), SKU `pakogsend-app`. Then send me the app's **Apple ID** number (App Information → General Information).
4. **Choose how the app is distributed** (next section).
5. **A privacy policy URL.** Apple requires one and pakogsend.dk has none yet. A draft is at the bottom of this file; once approved it can go on pakogsend.dk (for example `/privatlivspolitik/`).

## How to distribute it (choose one)

- **TestFlight**: fastest. Install the free TestFlight app on each iPad and invite up to 100 people with App Store Connect access. No App Review for internal testers. Each build expires after 90 days, so a new build is needed at least every 3 months.
- **Ad hoc install link**: like the Android download page. Each iPad is registered once (up to 100 per year), then the app installs from a link. No App Review.
- **Unlisted App Store app**: goes through App Review but isn't searchable; only people with the link can install it. Apply at https://developer.apple.com/support/unlisted-app-distribution/ after the first upload.
- **Custom app via Apple Business Manager**: private to the company. This works best with an MDM, which also unlocks the app's own kiosk lock on supervised iPads.
- **Public App Store**: possible, but Apple often rejects apps that only work for one company's own staff (staff login, set up per shop). If you choose this, App Review needs a working demo login and Shipmondo test credentials (see "App Review notes").

**Recommendation:** start with TestFlight or ad hoc for the shop iPads (no review, works right away), and apply for Unlisted distribution if you want an App Store link.

## Commands (what I run once the account is ready)

From `mobile/`, in Git Bash, with the API key set for this shell only:

```bash
export EXPO_ASC_API_KEY_PATH="C:/Users/kedde/.pakogsend/AuthKey_XXXXXXXXXX.p8"
export EXPO_ASC_KEY_ID="XXXXXXXXXX"
export EXPO_ASC_ISSUER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export EXPO_APPLE_TEAM_ID="XXXXXXXXXX"
export EXPO_APPLE_TEAM_TYPE="COMPANY_OR_ORGANIZATION"   # or INDIVIDUAL

# App Store / TestFlight build. EAS creates and stores the certificate and profile itself.
npx eas-cli build --platform ios --profile production --non-interactive

# Upload the latest build to App Store Connect (TestFlight). Needs the app's Apple ID number:
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

`eas build` reads the API key from the environment variables above, but `eas submit` reads it from `mobile/eas.json`. Before the first submit, add the app's Apple ID number and the key details there. Only the path to the `.p8` file goes into git, never the file itself:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "1234567890",
      "ascApiKeyPath": "C:/Users/kedde/.pakogsend/AuthKey_XXXXXXXXXX.p8",
      "ascApiKeyId": "XXXXXXXXXX",
      "ascApiKeyIssuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

For an **ad hoc install link** instead: register each iPad with `npx eas-cli device:create` (it gives a link/QR code to open on the iPad), then build with `npx eas-cli build --platform ios --profile preview`.

## Versions

- `expo.version` in `mobile/app.json` is the version the App Store shows. Keep it the same as the GitHub release tag (`mobile-v1.8.0` → `1.8.0`), and raise it for every new App Store version.
- Build numbers go up by themselves (`appVersionSource: remote` + `autoIncrement` in the `production` profile).

## Builds

- First iOS build (10 Nov 2026, Simulator, built successfully): https://expo.dev/accounts/pakogsend/projects/pak-and-send/builds/231e4079-37ae-4782-be99-57fbdca69126
- iOS Simulator test build (no Apple account needed): `npx eas-cli build --platform ios --profile ios-simulator`. It runs only in Xcode's Simulator on a Mac (download it from the Expo build page, unpack, drag the `.app` onto the Simulator). It's useful for App Store screenshots.
- Android builds and the APK download page are unchanged.

## App Store listing (draft, Danish)

- **Name** (max 30 characters, must be unique in the App Store): `Pak & Send`. If it's taken: `Pak & Send Pakkeshop` or `Pak og Send`.
- **Subtitle** (max 30): `Send pakker i butikken`
- **Category**: Business (secondary: Utilities)
- **Description**:
  > Pak & Send-appen bruges i Pak & Send-butikkerne til at oprette og printe forsendelser på stedet. Vælg fragtfirma (PostNord, GLS, Bring eller dao), levering til pakkeshop, privatadresse eller erhverv, vægt, afsender og modtager, og appen booker forsendelsen og printer labelen på butikkens Zebra-printer. Priserne følger butikkens egen prisliste. Appen kræver et Pak & Send-butikslogin.
- **Keywords** (max 100 characters): `pakke,fragt,label,PostNord,GLS,Bring,dao,pakkeshop,forsendelse,Zebra`
- **Support URL**: https://pakogsend.dk/kontakt/
- **Marketing URL** (optional): https://pakogsend.dk
- **Privacy policy URL**: still missing (see below).
- **Screenshots**: iPad 13" (2064 × 2752 portrait) and, because the app also runs on iPhone, iPhone 6.9" (1320 × 2868). Take them on a real iPad/iPhone (side button + volume up) or in the Simulator.
- **Age rating**: 4+ (no objectionable content).
- **Export compliance**: already answered in the app (`usesNonExemptEncryption: false`, HTTPS only).

## App Privacy answers (App Store Connect → App Privacy)

- **Data collected**: Contact Info (name, email address, phone number, physical address) of senders and recipients, entered to book shipments. Used for App Functionality only.
- **Linked to the user**: yes (the sender's own details). **Used for tracking**: no.
- **No analytics, no advertising, no third-party tracking** in the app.

## App Review notes (only needed for TestFlight external testers, Unlisted or App Store)

Give App Review:
- A staff login for the app (`/admin/login` user) that only works for review, and Shipmondo **sandbox** API credentials entered under Admin → Settings → Shipmondo on the review build, so bookings work without creating real shipments.
- A note: "Used by staff and customers at the counter in Pak & Send shops. Labels print on the shop's Zebra Bluetooth printer, so printing can't be tested without one; booking a shipment works with the provided sandbox account."

## Privacy policy (draft for you to check, Danish)

> **Privatlivspolitik for Pak & Send-appen**
>
> Dataansvarlig: Courier Copenhagen ApS (Pak & Send Internationalt Posthus), Gl. Kongevej 163, 1850 Frederiksberg C, CVR [udfyldes], info@pakogsend.dk, tlf. 33 25 77 25.
>
> **Hvilke oplysninger:** Når du sender en pakke i butikken, registrerer vi navn, adresse, e-mail og telefonnummer på afsender og modtager, pakkens vægt og mål, og ved forsendelser uden for EU en beskrivelse og værdi af indholdet (toldoplysninger).
>
> **Formål:** Oplysningerne bruges kun til at booke og levere forsendelsen, printe forsendelseslabel og sende track & trace-beskeder fra fragtfirmaet.
>
> **Modtagere:** Oplysningerne sendes til Shipmondo (forsendelsesplatform) og til det fragtfirma, du vælger (PostNord, GLS, Bring eller dao). Postnummeret slås op hos Danadresse for at finde bynavnet. Appens server drives hos [hostingleverandør, udfyldes].
>
> **Opbevaring:** [udfyldes, fx hvor længe forsendelser gemmes af hensyn til bogføring og reklamationer].
>
> **Dine rettigheder:** Du kan få indsigt i, rettet eller slettet dine oplysninger ved at skrive til info@pakogsend.dk. Du kan klage til Datatilsynet (datatilsynet.dk).
>
> Appen bruger ikke cookies, reklamer eller sporing. Bluetooth bruges kun til at forbinde til butikkens labelprinter.
