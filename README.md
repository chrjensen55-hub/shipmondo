# Pak & Send shipping application

A tablet-first customer shipping flow and staff operations dashboard for Pak & Send / Courier Copenhagen. The app is deliberately independent of the existing WordPress site and is ready to deploy to Vercel under `app.pakogsend.dk`.

## What is included

- Seven-step guest shipment wizard with refresh-safe non-sensitive progress, multi-parcel calculations, customs-aware contents, live carrier quotes, review, booking, and confirmation.
- Server-authoritative quote and shipment APIs with Zod validation and idempotency protection. Quotes and bookings call the real Shipmondo API v3 whenever credentials are configured and `SHIPMONDO_MOCK_MODE` is not `true`; otherwise both fall back to the built-in mock rates.
- Configurable pricing engine with percentage/fixed markup, minimum margin, minimum price, and rounding. Live quotes currently price parcels with an interim internal formula (`src/lib/shipmondo/quotes.ts`) rather than Shipmondo rate cards — Shipmondo has no rate-shopping endpoint, so the customer-facing estimate is ours; the actual carrier cost is only known once a shipment is booked, and is recorded as the authoritative purchase price at that point.
- Staff dashboard, shipment list/detail, pricing calculator, carriers, customers, settings, and printer setup screens. The printer settings page live-tests the Shipmondo connection and lists registered Print Client printers.
- PostgreSQL/Prisma schema covering stores, users, customers, shipments, parcels, items, quotes, pricing, carriers, printers, payments, and settings.
- Server-only Shipmondo client boundary (`src/lib/shipmondo/`) implementing HTTP Basic auth and the verified API v3 shapes for account, products, shipments, labels, and printers.
- Automated tests for critical weight, pricing, rounding, and customs logic.

## Local development

```bash
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:3000` for the customer app or `/admin` for the development dashboard.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SHIPMONDO_API_USERNAME` | Server-side Shipmondo username |
| `SHIPMONDO_API_KEY` | Server-side Shipmondo API key |
| `SHIPMONDO_API_BASE_URL` | Verified API v3 base URL |
| `SHIPMONDO_MOCK_MODE` | Set `true` until live integration is configured |
| `APP_URL` | Public application URL |
| `AUTH_SECRET` | Future server-side Auth.js secret |

Never prefix credentials with `NEXT_PUBLIC_`. `.env` files are ignored; `.env.example` is intentionally tracked.

## Database

Create a PostgreSQL database, set `DATABASE_URL`, then run:

```bash
npm run db:generate
npm run db:push
```

The intended defaults are documented in `prisma/seed.ts`. Wire this blueprint into an executable seed once a database/provider has been selected.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Architecture

```text
src/app/                 App Router pages and validated route handlers
src/components/customer Customer-only wizard UI (never renders internal cost)
src/components/admin    Staff-only operational views
src/lib/shipping.ts     Weight, pricing, customs, and mock quote domain logic
src/lib/shipmondo/      Server-only integration boundary
prisma/schema.prisma    PostgreSQL production data model
```

The browser submits only a quote ID. The shipment endpoint recreates available quotes on the server and chooses the authoritative price. Purchase prices remain in the server/admin domain.

## Mock mode

Keep `SHIPMONDO_MOCK_MODE=true` while credentials are unavailable. Customer pages never announce mock data; admins see a development-mode badge, which switches to a live-mode badge once Shipmondo is configured and reachable. Mock shipment references and tracking numbers are non-production data.

## Shipmondo integration

`src/lib/shipmondo/` wraps the verified Shipmondo API v3 (`https://sandbox.shipmondo.com/api/public/v3` for sandbox, `https://app.shipmondo.com/api/public/v3` for production — both use HTTP Basic auth with the API username/key from *Settings → API access*):

- `client.ts` — the authenticated HTTP wrapper.
- `account.ts`, `products.ts` — read the store profile and the carrier/product/service catalogue available on the account for a given destination.
- `quotes.ts` — picks one bookable product per carrier for a route and prices it with the interim internal formula, tagging each quote with the real `product_code`/`service_codes` needed to book it.
- `shipments.ts` — builds a real `parties`/`parcels`/`customs` request from a `ShipmentDraft` and books it. Customs is only sent when every goods item has a valid 6/8/10/12-digit commodity code; otherwise booking fails with a clear message rather than sending fabricated customs data.
- `printers.ts` — lists printers registered through the Shipmondo Print Client.

Shipmondo has no rate-shopping endpoint — price is only returned once a shipment is actually booked, so there is no way to "quote" several carriers without committing. The wizard therefore shows an internal price estimate at the quote step and books exactly once, at confirmation, recording Shipmondo's real price as the authoritative cost.

## Vercel deployment

Import the GitHub repository into Vercel, set the environment variables in each target environment, attach a PostgreSQL-compatible database, run the Prisma deployment step, and add `app.pakogsend.dk` as the project domain. Do not point or modify the WordPress deployment.

## Production checklist

- Configure PostgreSQL and migrations; replace the seed blueprint with an executable seed.
- Add Auth.js (or equivalent) and protect `/admin` plus every admin API on the server.
- Replace the interim internal pricing formula in `quotes.ts` with real per-carrier rate cards (the `PricingRule` model already supports this) once negotiated rates are known.
- Add an HS/commodity code field to the wizard's Contents step — customs-required international goods shipments currently fail booking (correctly) rather than guess a code.
- Replace in-memory idempotency with the unique database key in a transaction.
- Add durable rate limiting, structured log transport, payment, email, and privacy/retention policies.
- Perform live printer testing through Shipmondo Print Client with the Zebra/ZPL setup, and swap sandbox credentials for production ones (`https://app.shipmondo.com/api/public/v3`).
