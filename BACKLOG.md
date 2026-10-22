# BACKLOG.md — Prioritized Backlog

Status reflects the local build. `implemented.md` is the authoritative list of what works.

---

## P0 — Before the first real order

| Item | Why | Owner |
|---|---|---|
| Rotate the Telegram bot token in BotFather | The current token was shared in chat | Founder |
| Deploy API + web + Postgres | Bot webhook dies with the laptop; no public store | Founder + dev |
| Import the courier-served township list | Mock rows would accept undeliverable orders | Founder (CSV), dev (import) |
| Load the real catalog, prices, stock, photos | Mock products cannot be sold | Founder |
| Set the eComReg number in the footer | Compliance requirement | Founder |
| Real phone, address, support handle | Contact page currently shows placeholders | Founder |
| Set `CORS_ALLOWED_ORIGINS`, `APP_URL`, `FRONTEND_URL` | Checkout posts from the browser | Dev |
| Generate `APP_KEY`, `ORDER_TOKEN_SECRET`, `ADMIN_PASSWORD`, `ADMIN_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Defaults are development values | Dev |

## P1 — First week after launch

| Item | Why |
|---|---|
| Sentry (`SENTRY_DSN`) | Catch checkout and webhook exceptions in production |
| Plausible + UptimeRobot | Traffic and availability without GA4 |
| Lighthouse 3G on the production URL | The local Chrome pass does not prove LCP < 2.5s |
| Burmese copy for the tracking error state | It is English-only today |
| Admin alerts in a Telegram group | Currently mixed into the founder's private chat |
| Verify `#0F6FA8` contrast on the real display | Token contrast is still unmeasured |
| Daily Supabase backup + one restore drill | Orders and customers are the business |
| Scheduler and queue worker on the host | Session pruning and future jobs |

## P2 — V1.1

| Item | Notes |
|---|---|
| Supabase Storage for product images | Replace local SVGs; `NEXT_PUBLIC_IMAGE_BASE` already isolates the switch |
| Admin search/paging polish | List is filter + search only; fine at low volume |
| Bot: reorder from a past order | `/status` exists; a repeat-order button is the natural next step |
| Bot: broadcast new arrivals to a channel | Marketing channel, separate from the order bot |
| Export orders / remittance reconciliation | Courier settlement is manual today |
| Prepay (KBZPay / Wave) | Disabled in V1; callbacks and idempotency are not implemented |

## Deliberately out of scope for V1

- Customer accounts, OTP login, wishlist, reviews
- Promo codes, loyalty, referrals
- Multi-warehouse, international shipping
- Marketplace / multi-seller
