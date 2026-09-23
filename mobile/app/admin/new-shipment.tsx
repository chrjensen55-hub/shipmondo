import { Redirect } from 'expo-router'

// Fallback only - the "New shipment" tab intercepts its own press (see admin/_layout.tsx) and
// navigates to /send directly, leaving the Admin tab group entirely rather than showing a screen
// within it. This exists so the route still resolves to something sane if ever reached directly
// (e.g. a restored navigation state) instead of an empty tab.
export default function NewShipmentRedirect() {
  return <Redirect href="/send" />
}
