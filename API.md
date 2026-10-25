# API.md — ZayWear API

**Base URL:** `https://<api-host>/api` (local: `http://127.0.0.1:8000/api`)
**Format:** JSON in, JSON out. Send `Accept: application/json`.
**Auth:** public endpoints are open; admin endpoints require a bearer token; the Telegram webhook requires a secret header.

---

## 1. Conventions

| Topic | Behaviour |
|---|---|
| CORS | Only origins in `CORS_ALLOWED_ORIGINS` (comma-separated). The storefront posts orders from the browser, so the Vercel origin must be listed. |
| Rate limits | See the table below. Exceeding one returns `429` with `Retry-After`. |
| Validation errors | `422` with `{ "message": "...", "errors": { "field": ["..."] } }` |
| Not found | `404` with `{ "message": "..." }` |
| Tracking responses | Send `Referrer-Policy: no-referrer` so the token never leaks in a `Referer` header. |

| Limiter | Applies to | Budget |
|---|---|---|
| `api` | All public reads + webhook | 300/min per IP |
| `orders` | `POST /orders` | 10/min per IP |
| `tracking` | `GET /orders/{number}/{token}` | 60/min per IP |
| `admin` | Admin JSON **and** the Blade admin | 30/min per IP |
| `login` | Telegram start/poll and logout | 60/min per IP |
| `otp` | `POST /auth/otp/request` | 3/min per phone, 10/hour per IP |
| `otp-verify` | `POST /auth/otp/verify` | 10/min per IP |
| `lookup` | `POST /orders/lookup` | 5/min per IP |

Rate limiters are named in `app/Providers/AppServiceProvider.php`. Do not use inline `throttle:x,y` — it shares one counter per IP and will lock checkout out during server-side rendering.

---

## 2. Public endpoints

### `GET /config`

Storefront feature flags and links.

```json
{
  "currency": "MMK",
  "free_delivery_threshold_mmk": 80000,
  "cod_enabled": true,
  "kbzpay_enabled": false,
  "wave_enabled": false,
  "return_window_days": 7,
  "support_telegram": "",
  "telegram_bot": "zaywear_alerts_bot"
}
```

### `GET /categories`

```json
{ "data": [{ "id": 1, "slug": "men", "name_mm": "အမျိုးသား", "name_en": "Men", "sort_order": 1 }] }
```

### `GET /products`

Query: `category` (slug), `featured=1`, `q` (searches Burmese + English names), `sort` (`price_asc` | `price_desc` | default newest).

```json
{
  "data": [
    {
      "id": 1,
      "slug": "everyday-tee",
      "name_mm": "…",
      "name_en": "Everyday Tee",
      "category": { "id": 1, "slug": "men", "name_mm": "…", "name_en": "Men" },
      "base_price_mmk": 15000,
      "price_mmk": 15000,
      "is_featured": true,
      "image_url": "/mock/tee.svg",
      "variants": [
        { "id": 3, "size": "M", "color": "Black", "stock_qty": 4, "price_mmk": 15000 }
      ]
    }
  ]
}
```

`variants` only includes active, in-stock combinations.

### `GET /products/{slug}`

Single product, same shape as an item above. `404` when missing or inactive.

### `GET /products/{slug}/size-chart`

```json
{ "data": { "unit": "cm", "rows": [{ "size": "M", "chest_cm": 100, "length_cm": 70 }] } }
```

`404` when the product has no chart.

### `GET /townships`

Only active, courier-served townships.

```json
{ "data": [{ "id": 6, "region": "Yangon", "name_mm": "ဗဟန်း", "name_en": "Bahan", "delivery_fee_mmk": 1500 }] }
```

### `POST /orders`

Creates a COD order. Send `Idempotency-Key: <uuid>`: replaying the same key returns the original order with `200` instead of `201`, and a concurrent duplicate cannot create a second order.

```json
{
  "customer": { "name": "Thiri Aung", "phone": "09771234567" },
  "township_id": 6,
  "address_line": "No 45, Inya Road, Bahan",
  "landmark": "Near Bahan market",
  "note": "",
  "payment_method": "cod",
  "items": [{ "variant_id": 3, "qty": 2 }]
}
```

Rules enforced server-side:

- Prices, delivery fee, and free-delivery threshold are computed by the API; client prices are ignored.
- `qty >= 1`; stock is checked under `lockForUpdate` and decremented in the same transaction.
- `payment_method` must be enabled in settings. V1 only enables `cod`.
- Phone is normalised to `09…` and must match `^09[0-9]{7,9}$`.
- Township must be active.

`201 Created` (or `200` on idempotent replay):

```json
{
  "data": { "order_number": "ZW-000123", "status": "pending", "payment_status": "unpaid", "total_mmk": 31500, "…": "…" },
  "tracking": {
    "token": "…",
    "path": "/order/ZW-000123/…"
  }
}
```

Errors: `422` validation, `429` rate limit, `404` unknown township/variant.

### `GET /orders/{orderNumber}/{token}`

Public, signed tracking. The token is an HMAC over the order number with a 90-day expiry; it is not stored.

`200` returns `{ "data": { order_number, status, events, shipment, refusal_reason, created_at } }`. The payload is intentionally smaller than the account order: no address, items, payment, or customer, so a forwarded link cannot leak them.
`403` for a bad or expired token (identical message either way).
`404` for an unknown order number.

---

## 3. Customer accounts

Phone + Telegram OTP. There are no passwords and no SMS: the bot sends the code to the chat that has already shared the customer's phone number.

The storefront never sees the bearer token. `apps/web` proxies these calls through its own route handlers, keeps the token in an httpOnly `zw_session` cookie, and forwards the visitor IP so rate limits stay per-browser.

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/auth/telegram/start` | — | Returns `{ nonce, deep_link, expires_at }`; the link opens `https://t.me/<bot>?start=login_<nonce>` |
| `GET` | `/auth/telegram/poll/{nonce}` | — | `202` pending, `200 { status: "otp_required", phone_masked }`, `200 { data: { token, customer } }`, `410` expired |
| `POST` | `/auth/otp/request` | — | `{ "phone": "09…" }`. Always `200`, whether or not the phone is linked |
| `POST` | `/auth/otp/verify` | — | `{ "nonce": "…", "code": "123456" }` or `{ "phone": "09…", "code": "…" }` → `{ data: { token, customer } }` |
| `POST` | `/auth/logout` | Bearer | Revokes the presented token |
| `GET` | `/me` | Bearer | Profile, linked Telegram flag, saved addresses |
| `GET` | `/me/orders` | Bearer | Order history, newest first; 10 per page (`?page=2`) |
| `GET` | `/me/orders/{orderNumber}` | Bearer | One order plus a `tracking.path` |
| `POST` | `/me/orders/{orderNumber}/reorder` | Bearer | Returns cart lines capped to current stock (`requested_qty` carries the original), plus `unavailable` |
| `GET`/`POST` | `/me/addresses` | Bearer | List / create; the first address becomes the default |
| `PATCH`/`DELETE` | `/me/addresses/{id}` | Bearer | Scoped to the token's customer (`404` otherwise) |
| `POST` | `/orders/lookup` | — | `{ "order_number": "ZW-000123", "phone": "09…" }` → order + `tracking.path`; `404` when they do not match |

Tokens are 64-character opaque strings; only their SHA-256 hash is stored (`customer_tokens`), and they expire after `CUSTOMER_TOKEN_TTL_DAYS` (30 by default). OTPs are 6 digits, hashed, valid for `OTP_TTL_MINUTES` (10) and dead after `OTP_MAX_ATTEMPTS` (5) wrong tries.

Guest checkout stays the default: `/orders/lookup` and the signed tracking link work without an account.

---

## 4. Admin JSON

Header: `Authorization: Bearer <ADMIN_TOKEN>`. Missing or wrong → `401`. Rate limited to 30/min.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/admin/orders` | `status`, `from`, `to` (dates), `q` (order number or phone), paginated 50 |
| `GET` | `/admin/orders/{id}` | Full order with customer, township, items, events, shipment, payments |
| `PATCH` | `/admin/orders/{id}/status` | `{ "status": "confirmed" }`; optional `reason`, `refusal_reason` |
| `POST` | `/admin/orders/{id}/shipment` | `{ "carrier": "…", "tracking_number": "…" }` |
| `GET` | `/admin/metrics` | Orders/day, refusal rate, median delivery hours, revenue |

Status values: `pending`, `confirmed`, `packed`, `shipped`, `delivered`, `cancelled`, `refused`, `returned`.

Invalid transitions return `422` (for example `delivered → pending`). A COD order becomes `payment_status = paid` when it reaches `delivered`.

---

## 5. Telegram webhook

`POST /api/telegram/webhook`

Requires `X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>`. Wrong or missing → `401`.

Always answers `200` after a handled update so Telegram does not retry. See `TELEGRAM.md` for the conversation itself.

---

## 6. Local smoke test

```bash
curl -s http://127.0.0.1:8000/api/config

curl -s -X POST http://127.0.0.1:8000/api/orders \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Idempotency-Key: smoke-1' \
  -d '{"customer":{"name":"Test","phone":"09771234567"},"township_id":6,"address_line":"No 1, Test Road","landmark":"Test market","payment_method":"cod","items":[{"variant_id":1,"qty":1}]}'
```

After repeated order tests the IP hits the 10/min limit. Clear it with `php artisan cache:clear`.
