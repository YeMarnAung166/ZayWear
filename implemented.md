# implemented.md — What Is Actually Done

**Updated:** 2026-10-25
**Phase:** V2 — customer accounts (A1), order history (A2), wishlist (A5)
**Next:** remaining V2 items; V1 still needs the real eComReg number

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
- Telegram webhook: full conversational COD order flow (see below); `/start`, `/shop`, `/status ZW-…`, `/cancel`, `/help`, `/id`

### Core logic
- `OrderStateMachine`: explicit transition matrix, timestamps per state, `order_events` audit row, invalid transitions → `422`
- `OrderPricing`: server-side pricing only; delivery fee resolved from the township and **snapshotted** onto the order; free delivery at `80000 MMK` subtotal from `settings`
- `TrackingToken`: stateless base64url payload + HMAC-SHA256, 90-day expiry, order number bound into the payload; `Referrer-Policy: no-referrer` on page and API
- Idempotency: `Idempotency-Key` header, unique column, replay returns the same order with `200`; concurrent duplicate races fall back to the winning row
- Stock decremented inside the order transaction with `lockForUpdate`; over-quantity → `422` naming the size
- Rate limiters isolated by name: `api` 300/min (reads), `orders` 10/min, `tracking` 60/min. Inline `throttle:x,y` rules shared one counter per IP and blocked checkout when server-side rendering warmed the read cache — fixed
- Order number derived from the primary key (`ZW-` + 6 digits), portable across SQLite and Postgres

### Telegram bot
- Webhook `POST /api/telegram/webhook` verifies `X-Telegram-Bot-Api-Secret-Token` against `TELEGRAM_WEBHOOK_SECRET`, always answers `200` so Telegram does not retry a handled update
- Conversation state in `telegram_sessions` (one row per chat, 2-hour expiry): product → size/colour → quantity → name → phone → township → address → landmark → confirm
- Township picker lists only active townships in the same Yangon → Mandalay → Naypyidaw → rest order as the site; typing a township name filters the list
- Phone normalises `+959…` to `09…` and enforces the same `^09[0-9]{7,9}$` rule as checkout
- Confirming creates a real order through `OrderCreator`, the service now shared with the web checkout, so pricing, stock locks, customer upsert, payment row and audit event are identical; orders are tagged `placed_via = telegram`
- Double-tapping **Confirm** cannot duplicate an order: the session moves to `creating` before the transaction starts
- Success reply carries the order number, COD total, 1–3 day estimate and a signed tracking link; `/status ZW-000123 4567` issues a fresh link only when the last four phone digits match the order
- Optional admin alert goes to `TELEGRAM_ADMIN_CHAT_ID` when set, with **Confirm** / **Cancel** / **View order** buttons handled in the same webhook; `/id` reveals the chat id
- `TelegramClient` logs failed API calls with the Bot API description instead of throwing, so a delivery failure never breaks the webhook
- `TELEGRAM_CA_BUNDLE` passes an explicit CA file to Guzzle for local development behind a TLS-inspecting proxy (PHP's bundled roots do not include it); empty in production

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
- Mock layer: `lib/api.ts` falls back to `lib/mock-data.ts` only when `NEXT_PUBLIC_USE_MOCK=1`; production builds return an empty catalogue instead of unorderable placeholders. 8 local SVG product images in `public/mock`
- Mobile: 44px minimum targets, `overflow-wrap: anywhere` so Burmese compounds never widen the layout, Telegram FAB hidden on cart/checkout/order pages so it cannot cover a CTA

### Hardening + bot parity (2026-10-21)
- `/status` privacy: requires the order number **and** the last four phone digits; a mismatched pair returns the same generic message, so sequential `ZW-` numbers cannot be enumerated
- Mock fallback gated behind `NEXT_PUBLIC_USE_MOCK=1`; a production build returns an empty catalogue rather than placeholder products that cannot be ordered
- CORS allowlist via `CORS_ALLOWED_ORIGINS` (defaults to the two localhost origins); preflight verified for an allowed and a rejected origin
- `throttle:admin` (30/min per IP) on both the Blade admin and the admin JSON routes
- Admin order list auto-refreshes every 30 seconds, but only while the tab is visible
- Bot: quantity step after size (buttons 1–5, typed fallback up to stock or 20), size-aware deep links (`product_8_size_M`), and the PDP now passes the selected size
- Bot: `/order` and `/contact` commands; help text lists the new `/status` syntax
- Admin alert buttons **Confirm** / **Cancel** / **View order**; only `TELEGRAM_ADMIN_CHAT_ID` may act, and the alert is edited in place with the new status
- Expired `telegram_sessions` pruned hourly through `model:prune`
- `townships:import` command: validates a UTF-8 CSV (BOM tolerated), writes nothing if any row fails, upserts by region + English name, supports `--dry-run` and `--deactivate-missing`
- Contact page reads the bot handle from `/api/config` instead of a hardcoded mock bot
- `npm run lint` made green (three localStorage hydration effects annotated for `react-hooks/set-state-in-effect`)

### Localhost verification kit (2026-10-22)
- `DemoOrderSeeder`: ten orders covering every status (2 delivered, 2 pending, one each of confirmed/packed/shipped/refused/returned/cancelled) with customers, items, payments, shipments, backdated timelines, and events; prints signed tracking URLs. Tagged `placed_via = demo`, idempotent, opt-in, never moves stock
- `database/data/townships.example.csv`: nine-row template so `townships:import --dry-run` can be exercised without the courier file
- Rate limits are env-tunable (`API_/ORDER_/TRACKING_/ADMIN_RATE_LIMIT_PER_MINUTE`); local `.env` raises the order limit to 120 so verification runs do not trip `429`, production default stays 10
- `next.config.ts` fails a production build if `NEXT_PUBLIC_USE_MOCK=1` is baked in
- `allowedDevOrigins: ["127.0.0.1", "192.168.1.17"]` so the storefront hydrates on `127.0.0.1` and the LAN IP; without it Next 16 renders the page but blocks the client, leaving every button inert (reported as "add to cart not working")
- Fixed the admin order list 500: Laravel 13 removed `pagination::simple-default`; replaced with self-contained newer/older links
- `RUNBOOK.md` §1.1 is a 13-step local verification checklist with expected results
- Tests: `DemoOrderSeederTest` (3) covers every status, events, payments, shipments, tracking tokens, idempotency, and no-stock-change

### Hosting preparation (2026-10-22)
- `apps/api/Dockerfile` + `docker/`: PHP 8.4 Apache image with `pdo_pgsql`, intl, zip, opcache; Apache listens on Railway's `$PORT`; config/route/view caches are built at container start
- `apps/api/railway.json`: Dockerfile builder, `preDeployCommand` runs `migrate --force`, healthcheck `/api/config` (DB-aware)
- `bootstrap/app.php` trusts proxy headers so HTTPS URLs and secure session cookies work behind Railway
- `apps/web/vercel.json` pins the Singapore region; `apps/api/.env.production.example` and `apps/web/.env.production.example` document every production variable (three secrets must not keep local defaults)
- `scripts/backup-db.ps1`, `scripts/restore-db.ps1` (custom-format dumps, session pooler), `scripts/smoke-test.ps1` — 10 post-deploy checks, all passing against local
- RUNBOOK §3 rewritten with the actual Railway/Vercel/Supabase steps and a rollback table; §6 references the backup scripts

### V2 customer accounts + wishlist (2026-10-25)
- Customers log in through Telegram with an opaque bearer token stored server-side; the Next BFF keeps it in an httpOnly `zw_session` cookie and forwards the visitor IP
- Account page: order history with pagination, order detail/receipt, tracking timeline, saved addresses, reorder, logout
- Guest checkout stays the default; guests can still track an order with the order number and phone, or the signed link
- Wishlist: `wishlist_items` unique per customer + product; four `/me/wishlist` endpoints; saves persist across sessions and logout/login
- Hearts on cards and the PDP hydrate client-side from `/me/wishlist/ids`, keeping product pages static; guests are returned to the product after login
- `/account/wishlist` supports move-to-cart (one unit): direct when a single variant is in stock, inline colour/size picker otherwise; the row is removed on success and a **View cart** notice stays on the page
- The header has a wishlist heart with the saved count; guests are sent to login and returned to the wishlist
- Inactive products stay saved but are hidden from both wishlist responses and return if reactivated

### Verification
- `npm run build` — 29 routes, TypeScript clean; `npm run lint` clean
- `php artisan test` — 64 passing / 591 assertions, including the wishlist feature tests
- Wishlist tests cover guest rejection, save/list, idempotent saves, a new session, customer scoping, idempotent delete, unknown/inactive products, and inactive products disappearing from existing lists
- `vendor/bin/pint --dirty` clean
- API smoke: wishlist save `201`, duplicate `200`, ids/list, delete `200`, guest `401`; guest wishlist page `307` to login, and a signed-in login with `?next` `307` to the wishlist
- End-to-end in Chrome at 390 × 844 (historical): home → PDP → cart (2 lines) → checkout → `ZW-000001` → success → public tracking, in Burmese and English
- API smoke (historical): `201` create, replay `200`, `422` invalid transition, `403` bad token, `401` admin, `429` throttle

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
| Bot flow | 8-step chat order + confirm (product → size → qty → name → phone → township → address → landmark); township picker; real COD order via shared `OrderCreator` |
| Analytics | DB-computed business metrics + Plausible |
| Stack | Next.js 16 / React 19 / Tailwind 4 / Laravel 13 / PHP 8.4 |
| Images | Local SVG mock now; Supabase Storage `products` bucket later |

---

## Not Done Yet

- Permanent webhook host — the bot currently uses a `localtunnel` URL that changes when the tunnel restarts; deploy or use a named tunnel
- Rotate the bot token in BotFather before production — the current token was pasted into chat
- Real KBZPay/Wave prepay — disabled at launch via config, radios shown disabled
- Plausible, Sentry, uptime monitoring
- Lighthouse 3G run and page-weight measurement still pending on production
- Tracking page error copy is English-only; needs a Burmese variant
- Bot admin alerts land in the founder's private chat until a Telegram group is created
- Deploy: Supabase (Postgres + Storage), Railway, Vercel; queue worker
- `database/data/townships.csv` — waiting on the courier's coverage list

## Mock Data In Use

| Item | Mock value | Replace with |
|---|---|---|
| Townships | 41 rows across 14 regions | Courier-served list + real fee tiers |
| Products | 8 products, 64 variants, local SVGs | Real catalog + photography |
| Telegram bot | `@zaywear_alerts_bot` (`8828017102`), live token | Rename to `ZayWear` in BotFather if it should read as the shop, or keep it for alerts |
| Contact | `09 000 000 000`, Sanchaung address | Real phone and address |
| eComReg | "pending registration" | Registration number |

## Blocked On Founder

1. Courier partner + served-township list with fee tiers
2. Product catalog, prices, stock, and photography
3. Domain and eComReg application
4. Whether prepay (KBZPay/Wave) ships at launch
5. A permanent HTTPS host for the webhook (deploy, or a named Cloudflare tunnel)
