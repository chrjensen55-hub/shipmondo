# Pak & Send shipping application

A tablet-first customer shipping flow and staff operations dashboard for Pak & Send / Courier Copenhagen. The app is deliberately independent of the existing WordPress site and is ready to deploy to Vercel under `app.pakogsend.dk`.

## What is included

- Seven-step guest shipment wizard with refresh-safe non-sensitive progress, multi-parcel calculations, customs-aware contents, mock quotes, review, booking, and confirmation.
- Server-authoritative mock quote and shipment APIs with Zod validation and idempotency protection.
- Configurable pricing engine with percentage/fixed markup, minimum margin, minimum price, and rounding.
- Staff dashboard, shipment list/detail, pricing calculator, carriers, customers, settings, and printer setup screens.
- PostgreSQL/Prisma schema covering stores, users, customers, shipments, parcels, items, quotes, pricing, carriers, printers, payments, and settings.
- Server-only Shipmondo client boundary and explicit placeholders for API-v3 mapping. No guessed Shipmondo payload fields.
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

Keep `SHIPMONDO_MOCK_MODE=true` while credentials are unavailable. Customer pages never announce mock data; admins see a development-mode badge. Mock shipment references and tracking numbers are non-production data.

## Vercel deployment

Import the GitHub repository into Vercel, set the environment variables in each target environment, attach a PostgreSQL-compatible database, run the Prisma deployment step, and add `app.pakogsend.dk` as the project domain. Do not point or modify the WordPress deployment.

## Production checklist

- Configure PostgreSQL and migrations; replace the seed blueprint with an executable seed.
- Add Auth.js (or equivalent) and protect `/admin` plus every admin API on the server.
- Verify official Shipmondo API v3 documentation and implement shipment/printer endpoints without guessing fields.
- Replace in-memory idempotency with the unique database key in a transaction.
- Add durable rate limiting, structured log transport, payment, email, and privacy/retention policies.
- Perform live printer testing through Shipmondo Print Client with the Zebra/ZPL setup.
