import 'server-only'

// Deliberately checks the server's own env vars directly rather than going through
// ShipmondoClient (which also honors per-tablet header overrides) — this badge describes the
// server's own default configuration for the web app, not a per-request/per-tablet status, and
// keeping it a plain sync function avoids threading async through every admin page that shows it.
export function isShipmondoLive(): boolean {
  const configured = Boolean(process.env.SHIPMONDO_API_BASE_URL && process.env.SHIPMONDO_API_USERNAME && process.env.SHIPMONDO_API_KEY)
  return configured && process.env.SHIPMONDO_MOCK_MODE !== 'true'
}
