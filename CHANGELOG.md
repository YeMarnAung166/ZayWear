# CHANGELOG.md

## 0.5.3 — 2026-10-25

The public tracking page and the account order page now have separate jobs.

- `/order/{number}/{token}` is a tracker: status timeline with event times, courier, contact. Its API payload drops address, items, payment, and customer (`PublicOrderResource`), so forwarding the link cannot leak them
- `/account/orders/{number}` is the receipt: items, totals, discount, payment, delivery address, plus reorder and return/exchange. The status is a compact pill with the latest event time and a link to the tracker
- Shared status labels, tones, payment labels, and Yangon-pinned formatters moved into `lib/order-status.ts` and `lib/order-format.ts`
- The account order page no longer repeats the full timeline or links to an identical page
- Tests: 56 passing / 498 assertions

## 0.5.2 — 2026-10-25

Tracking page polish, shared by the public signed link and the account order detail.

- Completed timeline steps now carry the event timestamp (Yangon time) instead of only the current status
- Cancelled, refused, and returned orders show when that happened, and refused orders keep their reason
- Totals include the discount when one was applied, so the math reads correctly
- The payment method and status (COD, KBZPay, Wave; unpaid/paid/refunded) are shown with the totals
- The “Order” eyebrow no longer uses uppercase or letter-spacing, and the placed date is pinned to `Asia/Yangon`

## 0.5.1 — 2026-10-25

Order history (V2 A2) completed on top of A1.

- Order history is paginated in the UI (`/account?page=N`), so orders past the first ten are reachable; the list payload no longer eager-loads events, shipment, township, or customer
- The whole order row is a tap target for the order detail and tracking timeline; reorder stays an independent button
- Status pills use the semantic tokens; dates are pinned to `Asia/Yangon` so server and browser agree
- Reorder returns `requested_qty`, and the cart warns when a quantity was reduced to available stock
- Tests: 55 passing / 474 assertions

## 0.5.0 — 2026-10-25

Customer accounts (V2 A1), shipped on top of V1.

- `customers` becomes the customer identity: `telegram_chat_id`, `phone_verified_at`, `last_login_at` added; `users` stays staff-only
- Telegram login deep link (`/start login_<nonce>`): a first visit shares a contact card, later visits get a 6-digit OTP in the same chat
- Forwarded address-book cards are rejected unless `contact.user_id` matches the sender, so nobody can claim another person's phone
- Opaque 64-hex bearer tokens, stored as SHA-256 hashes with a 30-day TTL; custom middleware instead of Sanctum
- Next BFF keeps the token in an httpOnly `zw_session` cookie and forwards the visitor IP, so the token never reaches client JS and rate limits stay per-user
- Account page: order history, order detail, saved addresses, logout; reorder replaces the cart in one tap, capped to current stock
- Checkout prefills name, phone, and the default address; guest checkout remains the default
- Guest lookup by order number + phone (`POST /orders/lookup`) for buyers who do not use Telegram
- Tests: 52 passing / 400 assertions; API.md, TELEGRAM.md, and both env templates updated

## 0.4.0 — 2026-10-22

Hosting preparation for Vercel + Railway + Supabase.

- API production image (`Dockerfile`): PHP 8.4 + Apache, `pdo_pgsql`, opcache, runtime port from Railway, config/route/view caches built at boot
- `railway.json`: Dockerfile builder, `php artisan migrate --force` pre-deploy, `/api/config` healthcheck (proves the DB)
- Trusted proxies so HTTPS URLs and secure cookies work behind Railway
- `vercel.json` with the Singapore region; production env templates for both apps
- `scripts/backup-db.ps1`, `restore-db.ps1`, and `smoke-test.ps1` (10 checks, verified locally)
- RUNBOOK §3 rewritten: real deploy steps plus a rollback table and pre-deploy backup rule

## 0.3.1 — 2026-10-22

Localhost verification hardening.

- `DemoOrderSeeder`: ten backdated orders across every status, with events, payments, shipments, and printed tracking links; opt-in, idempotent, and stock-neutral
- `database/data/townships.example.csv` for testing the importer without real data
- Rate limits configurable per env; local order limit raised to 120/min
- Production build now fails if `NEXT_PUBLIC_USE_MOCK=1`
- `allowedDevOrigins` allows `127.0.0.1` and the LAN IP, fixing inert buttons caused by Next 16 blocking client hydration off `localhost`
- Fixed the admin order list 500 caused by Laravel 13 removing `pagination::simple-default`
- RUNBOOK §1.1 local verification checklist; tests now 33 / 289

## 0.3.0 — 2026-10-21

Hardening and bot parity, still on mock data.

- `/status` now requires the last four phone digits; sequential order numbers can no longer be enumerated
- Mock catalogue fallback gated behind `NEXT_PUBLIC_USE_MOCK=1`; production builds never serve unorderable placeholder products
- CORS allowlist (`CORS_ALLOWED_ORIGINS`), verified for allowed and rejected origins
- `throttle:admin` (30/min per IP) on the Blade admin and admin JSON
- Admin order list auto-refreshes every 30s while visible
- Bot: quantity step, size-aware deep links (`product_8_size_M`), `/order`, `/contact`
- Admin alerts gained Confirm / Cancel / View buttons; only `TELEGRAM_ADMIN_CHAT_ID` may use them
- Expired `telegram_sessions` pruned hourly
- `townships:import` command with validation, `--dry-run`, and `--deactivate-missing`
- Contact page reads the bot handle from `/api/config`; placeholder support handle removed
- `npm run lint` green; `php artisan test` 30 passing / 176 assertions
- Docs: `API.md`, `TELEGRAM.md`, `RUNBOOK.md`, `BACKLOG.md`, milestone status in `V1.md`

## 0.2.0 — 2026-10-21

Telegram bot became a real sales channel.

- Conversational COD flow: product → size → name → phone → township → address → landmark → confirm
- Orders created through the shared `OrderCreator` (`placed_via = telegram`)
- Live webhook on a `localtunnel` URL with a secret header
- Admin alert to `TELEGRAM_ADMIN_CHAT_ID`
- Double-tap protection, phone normalisation, township picker/search
- Local CA bundle support for TLS-inspecting proxies

## 0.1.0 — 2026-10-20

First mock build.

- Laravel 13 API: 14 models, seeders, order state machine, HMAC tracking, idempotent COD orders, admin JSON + Blade
- Next.js 16 storefront: 12 routes, Burmese-first with English toggle, cart, COD checkout, tracking
- 8 mock products, 41 mock townships, local SVG images
- 20 tests passing at the time
