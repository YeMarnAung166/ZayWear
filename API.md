# API.md — ZayWear API

**Base URL:** `https://<api-host>/api` (local: `http://127.0.0.1:8000/api`)
**Format:** JSON in, JSON out. Send `Accept: application/json`.
**Auth:** public endpoints are open; admin JSON requires a bearer token; `POST /admin/session` validates the shared admin password; the Telegram webhook requires a secret header.

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
| `tracking` | `GET /orders/{number}/{token}` and its `/payment` sibling | 60/min per IP |
| `payment-proofs` | `POST /orders/{number}/{token}/payment-proof` | 5/min per IP |
| `admin` | Admin JSON **and** the Blade admin | 30/min per IP |
| `admin-login` | `POST /admin/session` | 5/min and 20/hour per IP |
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
  "kbzpay_account_name": "",
  "kbzpay_phone": "",
  "wave_account_name": "",
  "wave_phone": "",
  "return_window_days": 7,
  "support_telegram": "",
  "telegram_bot": "zaywear_alerts_bot"
}
```

`kbzpay_enabled` and `wave_enabled` are **effective** availability: the setting must be on **and** the matching account name and `09…` phone must be present. A half-configured wallet stays hidden from checkout, the footer, and the bot. The admin settings endpoint returns the raw flags instead, so the merchant can see what they saved.

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

Creates an order. Send `Idempotency-Key: <uuid>`: replaying the same key returns the original order with `200` instead of `201`, and a concurrent duplicate cannot create a second order.

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
- `payment_method` must be one of `cod`, `kbzpay`, `wave` **and** currently available. Prepaid methods need complete receiving-account details (see `GET /config`).
- Phone is normalised to `09…` and must match `^09[0-9]{7,9}$`.
- Township must be active.

Prepaid orders are created `unpaid` with a `pending` payment row. The receiving account shown to the customer is snapshotted into `payments.raw_payload.instructions` (`account_name`, `phone`) plus `reference` (the order number), so changing settings later cannot rewrite what the customer was told. The order ships only after an admin marks the payment received.

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

### `GET /orders/{orderNumber}/{token}/payment`

Prepaid instructions and receipt history behind the same signed tracking token. No account needed.

```json
{
  "data": {
    "method": "kbzpay",
    "status": "unpaid",
    "total_mmk": 31500,
    "is_prepaid": true,
    "instructions": {
      "account_name": "ZayWear",
      "phone": "09123456789",
      "reference": "ZW-000123"
    },
    "telegram_url": "https://t.me/zaywear_alerts_bot?start=pay_ZW-000123",
    "proofs": [
      { "id": 7, "status": "pending", "source": "web", "created_at": "2026-10-26T10:00:00+00:00" }
    ],
    "rejection_reason": null,
    "can_upload": true
  }
}
```

- `instructions` is the snapshot from order creation and is `null` when the wallet has no usable account details.
- `rejection_reason` is the review note of the latest rejected receipt, shown to the customer so they can correct it.
- `can_upload` is `true` only while the order is prepaid, `unpaid`, and `pending`/`confirmed`/`packed`.
- COD orders return `is_prepaid: false` and `instructions: null`.
- `403` for a bad or expired token; `404` for an unknown order number.

### `POST /orders/{orderNumber}/{token}/payment-proof`

Uploads one receipt. `multipart/form-data` with a single `receipt` file.

- Allowed: `image/jpeg`, `image/png`, `application/pdf`; maximum **5 MB**.
- Maximum **5 receipts per order**.
- Rate limited to **5 uploads per minute per IP** (the `payment-proofs` limiter; `PAYMENT_PROOF_RATE_LIMIT_PER_MINUTE` sets the budget).
- `201` returns `{ "data": { "id", "status": "pending", "created_at" } }`.
- `422` when the order is not prepaid, already paid, closed, over the receipt cap, or the file fails validation.
- `503` when proof storage is not configured. Production refuses to fall back to Railway's ephemeral filesystem; send the receipt to the bot instead.

Receipts live in the private Supabase Storage bucket `payment-proofs`. They are never public: admins view them through a 10-minute signed URL.

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
| `GET` | `/me/wishlist` | Bearer | Active saved products, newest first, with the same product payload as the catalogue |
| `GET` | `/me/wishlist/ids` | Bearer | Just the saved product ids, used to hydrate hearts on static pages |
| `POST` | `/me/wishlist` | Bearer | `{ "product_id": 1 }`; `201` created, `200` if already saved, `404` unknown or inactive |
| `DELETE` | `/me/wishlist/{productId}` | Bearer | Idempotent and scoped to the token's customer |
| `GET`/`POST` | `/me/addresses` | Bearer | List / create; the first address becomes the default |
| `PATCH`/`DELETE` | `/me/addresses/{id}` | Bearer | Scoped to the token's customer (`404` otherwise) |
| `POST` | `/orders/lookup` | — | `{ "order_number": "ZW-000123", "phone": "09…" }` → order + `tracking.path`; `404` when they do not match |

Tokens are 64-character opaque strings; only their SHA-256 hash is stored (`customer_tokens`), and they expire after `CUSTOMER_TOKEN_TTL_DAYS` (30 by default). OTPs are 6 digits, hashed, valid for `OTP_TTL_MINUTES` (10) and dead after `OTP_MAX_ATTEMPTS` (5) wrong tries.

Wishlist saves are per product, not per variant. Inactive products stay in `wishlist_items` but are omitted from both wishlist responses, so they reappear if the product is reactivated. Moving an item to the cart is a storefront action: it removes the saved row and adds one unit of the chosen variant.

Guest checkout stays the default: `/orders/lookup` and the signed tracking link work without an account.

---

## 4. Admin

### `POST /admin/session`

Validates the shared operations password so the Next.js admin can start a session. No bearer token is needed; the endpoint only answers whether the password is right.

```json
{ "password": "…" }
```

- `200 { "ok": true }` when the password matches `ADMIN_PASSWORD`
- `422` with `errors.password` when it does not, or when `ADMIN_PASSWORD` is unset
- `429` after 5 attempts in a minute or 20 in an hour from one IP (`ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE` overrides the minute budget)

The endpoint does not issue a token. The Next.js server owns the signed httpOnly `zw_admin` cookie (12 hours, `ADMIN_SESSION_SECRET`), and `ADMIN_TOKEN` never leaves the server.

### Admin JSON

Header: `Authorization: Bearer <ADMIN_TOKEN>`. Missing or wrong → `401`. Rate limited to 30/min.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/admin/orders` | `status`, `payment_status`, `payment_method`, `from`, `to` (dates), `q` (order number or phone), `page`; 50 per page |
| `GET` | `/admin/orders/{id}` | Full order with customer, township, items, events, shipment, payments and their receipts, `payment_required_before_shipping`, `can_mark_paid`, `allowed_transitions` |
| `PATCH` | `/admin/orders/{id}/status` | `{ "status": "confirmed" }`; optional `reason`, `refusal_reason`. `packed → shipped` is rejected with `422` while a prepaid order is unpaid |
| `POST` | `/admin/orders/{id}/shipment` | `{ "carrier": "…", "tracking_number": "…" }`; `cod_amount_mmk` is set from the order total for COD and `0` for prepaid |
| `POST` | `/admin/orders/{id}/payment/verify` | Marks a prepaid payment received. Optional `reference` (wallet transaction ID, unique), `note`, `proof_id`. Approves pending receipts and confirms a pending order |
| `POST` | `/admin/orders/{id}/payment/reject` | `{ "proof_id": 7, "reason": "…" }`; only a pending receipt can be rejected |
| `GET` | `/admin/payment-proofs/{proof}/url` | Returns `{ "url", "expires_at" }` for a private receipt; the URL expires in 10 minutes |
| `GET` | `/admin/settings/payments` | Raw payment flags and receiving-account fields |
| `PUT` | `/admin/settings/payments` | Saves all seven fields; enabling a wallet requires an account name and a valid `09…` phone, and at least one method must stay usable |
| `GET` | `/admin/settings/store` | Free-delivery threshold, return window, and support Telegram handle |
| `PUT` | `/admin/settings/store` | Saves all three fields; threshold `0…10,000,000`, window `1…30` days, optional Telegram username |
| `GET` | `/admin/metrics` | Orders today/7d/30d, refusal rate and reasons, median delivery hours, delivered revenue, status counts |

List response `meta`: `current_page`, `last_page`, `per_page`, `total`, and `status_counts` (one entry per status present, e.g. `{ "pending": 3, "delivered": 12 }`). `status_counts` ignores the payment filters.

Order fields common to list and detail: `id`, `order_number`, `status`, `payment_status`, `payment_method`, `placed_via`, `subtotal_mmk`, `delivery_fee_mmk`, `discount_mmk`, `total_mmk`, `note`, `customer` (`name`, `phone` masked in the list), `township` (`name_mm`, `name_en`, `region`), `address_line`, `landmark`, `items_count`, `created_at`, `refusal_reason`, `cancel_reason`.

Detail adds `items` (`name_mm`, `name_en`, `size`, `color`, `qty`, `unit_price_mmk`, `line_total_mmk`), `events` (`from`, `to`, `actor`, `reason`, `at`), `shipment` (`carrier`, `tracking_number`, `cod_amount_mmk`, `dispatched_at`, `delivered_at`), the full customer phone, `payments`, `payment_required_before_shipping`, `can_mark_paid`, and `allowed_transitions` — the statuses this order may move to next. The list omits those arrays and always returns `allowed_transitions: []`.

Each payment row carries `id`, `provider`, `status`, `amount_mmk`, `provider_ref`, `paid_at`, `instructions` (the receiving-account snapshot), `verification` (`verified_by`, `verified_at`, `note`), and `proofs` (`id`, `source`, `status`, `original_name`, `mime_type`, `size_bytes`, `review_note`, `reviewed_at`, `created_at`).

`payment_required_before_shipping` is `true` for a prepaid order that is not `paid`. `can_mark_paid` is `true` for a prepaid order that is not `paid` and not `cancelled`/`refused`/`returned`.

Status values: `pending`, `confirmed`, `packed`, `shipped`, `delivered`, `cancelled`, `refused`, `returned`.

Invalid transitions return `422` (for example `delivered → pending`). A COD order becomes `payment_status = paid` when it reaches `delivered`; a prepaid order becomes `refunded` when it reaches `returned`. Verifying a prepaid payment while the order is still `pending` moves it to `confirmed` in the same transaction; already confirmed or packed orders keep their status.

### Payment settings

`GET` and `PUT /admin/settings/payments` share one shape:

```json
{
  "data": {
    "cod_enabled": true,
    "kbzpay_enabled": true,
    "wave_enabled": false,
    "kbzpay_account_name": "ZayWear",
    "kbzpay_phone": "09123456789",
    "wave_account_name": "",
    "wave_phone": ""
  }
}
```

`PUT` requires all seven fields. Phones accept `+959…`, `959…`, or `09…` and are stored normalised to `09…`. A wallet may be enabled only with a non-empty account name and a valid phone; at least one method must remain usable. Saving bumps the public response cache version, so `GET /config` and the storefront change immediately.

### Store settings

`GET` and `PUT /admin/settings/store` share one shape:

```json
{
  "data": {
    "free_delivery_threshold_mmk": 80000,
    "return_window_days": 7,
    "support_telegram": "zaywear_support"
  }
}
```

`PUT` requires all three fields. `free_delivery_threshold_mmk` is `0…10,000,000`; `0` makes every order eligible for free delivery. `return_window_days` is `1…30` and drives the product-page and returns-policy copy. `support_telegram` is optional: it accepts `@handle`, `handle`, or a `t.me` link, is stored without `@`, and must be 5–32 letters, numbers, or underscores. Saving bumps the public response cache version, so `GET /config`, the storefront, and the bot change immediately.

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

Prepaid smoke test (use the token from the create response):

```bash
curl -s http://127.0.0.1:8000/api/orders/ZW-000123/<token>/payment

curl -s -X POST http://127.0.0.1:8000/api/orders/ZW-000123/<token>/payment-proof \
  -H 'Accept: application/json' \
  -F 'receipt=@receipt.jpg'
```

Local and testing environments store receipts on the local disk and serve them through a short-lived signed route. Production requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the private `payment-proofs` bucket; otherwise uploads return `503`.
