# CHANGELOG.md

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
