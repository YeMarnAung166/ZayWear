# implemented.md — What Is Actually Done

**Updated:** 2026-10-20
**Phase:** M2–M3 mock build — storefront, API, admin, tracking run locally on mock data
**Next:** swap in real townships, bot token, catalog + photography; then deploy (M1/M4)

---

## Done

### Phase 0 documents
- `V1.md` v1.1 — scope, 12 pages, API surface, acceptance criteria, milestones
- `DESIGN.md` v1.1 — tokens, type scale, UX non-negotiables
- `AGENT.md` v1.0 — operating contract and definition of done
- `ARCHITECTURE.md` v1.0 — schema, state machine, token format, pricing rules

### Repo + toolchain
- `git init` at the repo root; `apps/api`, `apps/web`, `database/data/`
- Laravel 13.38 on PHP 8.4.26; Next.js 16.4.2 on React 19.3; Tailwind 4; Node 24.22; Composer 2.10
- Laravel Boost installed (`composer require laravel/boost --dev`, `php artisan boost:install`)
- Local dev uses SQLite (`apps/api/database/database.sqlite`), `QUEUE_CONNECTION=sync`, `SESSION_DRIVER=file`

### API — schema and seed data
- 14 models + migrations, `migrate:fresh --seed` clean: `settings`, `townships`, `categories`, `products`, `product_variants`, `product_images`, `size_charts`, `customers`, `orders`, `order_items`, `order_events`, `payments`, `shipments`, `telegram_sessions`
- Seeders: `SettingsSeeder`, `TownshipSeeder` (41 mock townships, fee tiers 1500/2500/3500), `CategorySeeder` (men, women), `SizeChartSeeder`, `ProductSeeder` (8 mock products × 2 colours × 4 sizes, with deliberate zero-stock combinations)

### API — endpoints
- Public: `GET /api/config`, `/categories`, `/products` (filter + sort + `q`), `/products/{slug}`, `/products/{slug}/size-chart`, `/townships`, `POST /orders`, `GET /orders/{number}/{token}`
- Admin JSON (bearer token): `GET /admin/orders`, `/admin/orders/{id}`, `PATCH /admin/orders/{id}/status`, `POST /admin/orders/{id}/shipment`, `GET /admin/metrics`
- Telegram webhook: `/start`, `/start product_{id}`, `/status ZW-…`, `/help` — replies are logged until a real bot token is supplied; the full 12-step flow is still M3 work

### Core logic
- `OrderStateMachine`: explicit transition matrix, timestamps per state, `order_events` audit row, invalid transitions → `422`
- `OrderPricing`: server-side pricing only; delivery fee resolved from the township and **snapshotted** onto the order; free delivery at `80000 MMK` subtotal from `settings`
- `TrackingToken`: stateless base64url payload + HMAC-SHA256, 90-day expiry, order number bound into the payload; `Referrer-Policy: no-referrer` on page and API
- Idempotency: `Idempotency-Key` header, unique column, replay returns the same order with `200`; concurrent duplicate races fall back to the winning row
- Stock decremented inside the order transaction with `lockForUpdate`; over-quantity → `422` naming the size
- Rate limiters isolated by name: `api` 300/min (reads), `orders` 10/min, `tracking` 60/min. Inline `throttle:x,y` rules shared one counter per IP and blocked checkout when server-side rendering warmed the read cache — fixed
- Order number derived from the primary key (`ZW-` + 6 digits), portable across SQLite and Postgres

### Admin (Blade)
- `/admin/orders` list with status filter and search, `/admin/orders/{id}` detail, `/admin/metrics`
- HTTP Basic via `ADMIN_PASSWORD`; `/` redirects to the order list
- Status transitions and courier/tracking-number capture post back through the same state machine

### Storefront (Next.js)
- 12 routes: `/`, `/c/[slug]`, `/p/[slug]`, `/cart`, `/checkout`, `/order/[number]/success`, `/order/[number]/[token]`, `/search`, `/returns`, `/terms`, `/privacy`, `/contact`, plus `not-found`
- Burmese default with English toggle (`localStorage`), all copy rendered through the client i18n context
- Noto Sans Myanmar + Inter via `next/font`, DESIGN.md tokens as Tailwind 4 `@theme`
- Product grid, PDP with colour/size selector (disabled out-of-stock sizes), size-guide modal, quantity stepper, Telegram order CTA, add-to-cart
- Cart in `localStorage` with stock caps, free-delivery nudge, checkout CTA
- COD checkout: validation, township select ordered Yangon → Mandalay → Naypyidaw → rest and showing the fee inline, disabled KBZPay/Wave, `crypto.randomUUID()` idempotency key, server error surfacing
- Success page reads a session snapshot, shows the order summary, and offers **Copy tracking link** instead of a raw token URL
- Tracking page: 5-step timeline, masked phone, item/total breakdown, terminal states including `refused` and `returned`
- Search page, policy pages (returns, terms, privacy), contact page, 404
- Mock layer: `lib/api.ts` falls back to `lib/mock-data.ts` when the API is unreachable; 8 local SVG product images in `public/mock`
- Mobile: 44px minimum targets, `overflow-wrap: anywhere` so Burmese compounds never widen the layout, Telegram FAB hidden on cart/checkout/order pages so it cannot cover a CTA

### Verification
- `npm run build` — 13 routes, TypeScript clean
- `php artisan test` — 13 passing / 58 assertions (`OrderApiTest`: creation + fee snapshot, free-delivery threshold, idempotent replay, stock rejection, inactive township, valid/tampered/expired tracking, admin auth, invalid transition, COD paid on delivery)
- `vendor/bin/pint --dirty` clean
- End-to-end in Chrome at 390 × 844: home → PDP → cart (2 lines) → checkout → `ZW-000001` → success → public tracking, in Burmese and English
- API smoke: `201` create, replay `200`, `422` invalid transition, `403` bad token, `401` admin, `429` throttle

---

## Decisions Locked

| Decision | Value |
|---|---|
| Delivery fee | Per township, snapshotted on the order |
| Fee tiers | `1500` metro / `2500` secondary / `3500` remote |
| Free delivery | At `80000 MMK` subtotal (`settings.free_delivery_threshold_mmk`) |
| Township scope | Only courier-served townships, `is_active` flag |
| Order states | `pending → confirmed → packed → shipped → delivered` + `cancelled`, `refused`, `returned` |
| Payment states | `unpaid`, `paid`, `failed`, `refunded`; COD → `paid` on `delivered` |
| Order number | `ZW-000123`, derived from the primary key (no sequence) |
| Tracking | Stateless HMAC token in the path, 90 days, `no-referrer` |
| Admin | Laravel Blade, HTTP Basic, list + detail only |
| Bot flow | 12 steps including address (webhook stubs only for now) |
| Analytics | DB-computed business metrics + Plausible |
| Stack | Next.js 16 / React 19 / Tailwind 4 / Laravel 13 / PHP 8.4 |
| Images | Local SVG mock now; Supabase Storage `products` bucket later |

---

## Not Done Yet

- Full 12-step Telegram order flow, notifications, admin alerts (M3)
- Real KBZPay/Wave prepay — disabled at launch via config, radios shown disabled
- Plausible, Sentry, uptime monitoring
- Deploy: Supabase (Postgres + Storage), Railway, Vercel; queue worker
- `API.md`, `TELEGRAM.md`, `BACKLOG.md`, `RUNBOOK.md`, `CHANGELOG.md`
- `database/data/townships.csv` — waiting on the courier's coverage list

## Mock Data In Use

| Item | Mock value | Replace with |
|---|---|---|
| Townships | 41 rows across 14 regions | Courier-served list + real fee tiers |
| Products | 8 products, 64 variants, local SVGs | Real catalog + photography |
| Telegram bot | `@zaywear_mock_bot` | Real bot token + username |
| Contact | `09 000 000 000`, Sanchaung address | Real phone and address |
| eComReg | "pending registration" | Registration number |

## Blocked On Founder

1. Courier partner + served-township list with fee tiers
2. Telegram bot token and username
3. Product catalog, prices, stock, and photography
4. Domain and eComReg application
5. Whether prepay (KBZPay/Wave) ships at launch
