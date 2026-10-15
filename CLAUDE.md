@AGENTS.md

# Permanent App Development Rules

These are standing project rules. Read them before any change, and treat them as unchanged unless the user explicitly changes them. Do not remove working functionality unless a rule below requires it.

## 1. Download page keeps only the 5 latest versions

- Always keep exactly the 5 most recent versions downloadable. Older versions are deleted.
- The newest version is labelled **Latest Version**.
- After publishing a new version, delete GitHub releases beyond the 5 latest (`gh release delete`) so the count never exceeds 5.
- Releases are published as separate GitHub releases (`mobile-vX.Y.Z`), each with its own APK asset. The download page lists whichever of them still exist.

## 1a. Locations and prices

- The Admin > Settings screen has a "Location" section at the top, listing every shop location (Courier Copenhagen, Pak og Send Lyngby, Pak og Send Borups Allé, Location 4–10).
- Choosing a location makes it the active location for that tablet and opens its price list for editing.
- Customers on a tablet only ever see that tablet's active location's prices and enabled carriers.
- Within one location, every enabled carrier shares the same price for a given weight bracket. Carriers can be turned on/off per location; an off carrier never appears in carrier selection.
- Location data (carriers, prices) lives on-device (`mobile/src/lib/locations.ts` + `location-context.tsx`) and is sent to the server with each quote/booking request so pricing matches what the tablet shows.

## 2. Denmark → Denmark city from postal code

- When sender and receiver are both in Denmark, the postal code automatically fills in the city (e.g. 2730 → Herlev).
- Shipmondo's API has no postal-code-to-city endpoint (its `/pickup_points` only returns carrier service points), so the city comes from Danadresse (the official Danish address API that replaced DAWA on 1 Oct 2026). The key lives on the server as `DANADRESSE_API_KEY`, never in the app.
- Works for every valid Danish postal code and for every carrier. Do not hard-code example codes.
- While the lookup runs, show "Finding city…". An invalid code shows a plain-language message ("We could not find a Danish city for this postal code…"). Never show raw API errors.
- Must not break existing carriers, existing shipment creation, or international shipments.

## 3. Final flow: Create → Print Label → Exit → New shipment

- Do not show **Done** before printing.
- After a shipment is created, show **Print Label** as the main action.
- While printing, show a loading state ("Preparing label…" / "Printing label…") and prevent duplicate taps.
- After printing succeeds, show "Label printed successfully" and replace the Print button with **Exit**.
- **Exit** clears the temporary shipment form, returns to the first page, and prepares for a new shipment. It must never delete the created shipment or the shipment history.

## 4. Refresh

- A **Refresh** action lives in the burger menu (Home, Refresh, Settings).
- Refresh restarts only the current active shipment workflow: clears the form and temporary state, then returns to the first page.
- If the user has entered shipment data, confirm first with "Refresh shipment?" and Cancel / Refresh. If there is no data, Refresh happens immediately.
- Refresh never deletes completed shipments, shipment history, previous app versions, or permanent settings.

## 5. One consistent UI

- All new functionality uses the new Tailwind design system. Do not bring back old components.
- Keep fonts, spacing, buttons, inputs, cards, radii, shadows, colours, loading states, error states, success states, and confirmation dialogs consistent across all screens.
- Button hierarchy: primary (main action, e.g. Continue, Create shipment, Print label), secondary (Back, Edit), neutral (Exit, Refresh), destructive (only for permanently deleting or cancelling something). Every button needs default, pressed, disabled, and loading states, and must be easy to tap on a touchscreen.
- The step bar shows the active step clearly and marks completed steps.

## 6. Tailwind styling

- Tailwind is the styling system. The Android app uses NativeWind (Tailwind classes for React Native). The web app uses Tailwind v4.
- Shared components live in `src/components` (Button, TextField, StepProgress, WizardScreen, etc.) and are reused everywhere.
- Keep transitions short and subtle. Never make the app feel slower.
- Errors and success messages are plain language. Technical details go to logs only.

## 7. Kiosk mode and keyboard

- The tablet runs as a public kiosk. Kiosk Mode (Android Lock Task) is provided by the local Expo module `mobile/modules/kiosk`; setup is in `KIOSK_SETUP.md`. The exit code lives in one constant, `KIOSK_EXIT_CODE` in `mobile/src/lib/kiosk.tsx`.
- Every screen with text fields uses `KeyboardAwareScreen` so the focused field and the Back/Continue bar stay above the keyboard (edge-to-edge and immersive mode do not resize the window).
- Design reference: `docs/design-reference.png`. Tokens live in `mobile/tailwind.config.js` / `mobile/src/lib/theme.ts`.

## Testing checklist before every release

1. Denmark → Denmark postal code auto-fills the city for several valid codes (e.g. 2730, 2000, 2100, 2800, 8000, 9000). An invalid code shows the friendly message.
2. Create Shipment → Print Label → Exit → New shipment works, and Done is not shown before printing.
3. Refresh works from every stage and does not delete completed shipments.
4. Exit prepares the app for another shipment.
5. Layouts work on phone, tablet, and desktop.
6. Existing carriers and international shipments still work.
7. Exactly the 5 most recent app versions are listed on the download page — no more, no fewer.
8. Switching the active location changes the prices and carriers customers see, and prices sent to the server match what was shown.
9. Email and Phone fields stay visible above the keyboard with kiosk mode on and off; kiosk exit code works and blocks after 5 wrong tries.
