# ARCHITECTURE.md — System Architecture & Data Model

**Version:** 1.1
**Status:** Active
**Related:** `V1.md` (scope), `DESIGN.md` (UI), `AGENT.md` (build rules)

This document is the schema contract. Change it before changing code, never the other way round.

---

## 1. Topology

```
                    ┌─────────────────────┐
   Customer phone ──┤ Next.js (Vercel)    │
                    │ app router, SSR     │
                    └──────────┬──────────┘
                               │ HTTPS JSON
                    ┌──────────▼──────────┐        ┌──────────────────┐
   Telegram  ───────┤ Laravel (Railway)   ├────────┤ Supabase Postgres│
   webhook          │ API + bot + admin   │        │ session pooler   │
                    │ queue worker        │        └──────────────────┘
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Supabase Storage    │  product images
                    └─────────────────────┘
```

- **Frontend** is stateless. Cart lives in `localStorage`. No server session.
- **Backend** owns all money, stock, and state. The client may display a total but never computes the authoritative one.
- **Queue** is the Laravel database driver. Telegram sends and courier pushes never block a request.
- **Admin** is the Next.js app at `/admin` (V2 B1). It keeps `ADMIN_TOKEN` server-side, calls the admin JSON API, and owns a signed httpOnly session cookie. Laravel's Blade admin stays for one release as a fallback.

### Environments

| Env | Web | API | Bot | Payments |
|---|---|---|---|---|
| local | `localhost:3000` | `localhost:8000` | sandbox bot | sandbox |
| staging | Vercel preview | Railway staging | sandbox bot | sandbox |
| production | custom domain | Railway prod | live bot | COD + KBZPay/Wave prepaid, manual verification |

Staging must never point at the production bot or the production Telegram admin chat.

---

## 2. Data Model

Money columns are **integer MMK**. Never floats, never strings.
All tables have `created_at` / `updated_at` unless noted.

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| slug | varchar(80) UNIQUE | URL segment |
| name_mm, name_en | varchar(120) | |
| parent_id | bigint NULL FK→categories | two levels max in v1 |
| sort_order | smallint | |
| is_active | boolean | |

### `products`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| slug | varchar(140) UNIQUE | |
| category_id | bigint FK | |
| name_mm, name_en | varchar(200) | |
| description_mm, description_en | text | |
| fabric_care_mm, fabric_care_en | text NULL | accordion content |
| base_price_mmk | integer | |
| compare_at_price_mmk | integer NULL | drives the Sale badge |
| is_featured | boolean | home grid |
| is_active | boolean | |

### `product_images`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| product_id | bigint FK | |
| path | varchar(255) | Supabase Storage object key |
| alt_mm, alt_en | varchar(200) | required — accessibility |
| sort_order | smallint | |
| is_primary | boolean | one per product, enforced in app |

### `product_variants`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| product_id | bigint FK | |
| sku | varchar(64) UNIQUE | |
| size | varchar(16) | `S`, `M`, `L`, `XL`, `XXL` |
| color | varchar(40) | display name |
| color_hex | char(7) | swatch |
| stock_qty | integer | decremented transactionally |
| price_delta_mmk | integer DEFAULT 0 | |
| is_active | boolean | |

UNIQUE `(product_id, size, color)`.

### `size_charts`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| category_id | bigint FK | one chart per category |
| title_mm, title_en | varchar(120) | |
| rows | jsonb | `[{size, chest_cm, waist_cm, length_cm, chest_in, ...}]` |

Rendered in the PDP size-guide modal. Served by `GET /products/{slug}/size-chart`.

### `townships`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| region | varchar(80) | state/region |
| name_mm | varchar(120) | display value |
| name_en | varchar(120) | search alias |
| delivery_fee_mmk | integer | |
| is_active | boolean | only active rows reach the dropdown |

Seeded from `database/data/townships.csv`, restricted to townships the courier actually serves.

### `customers`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| phone | varchar(20) UNIQUE | normalized `09…` |
| name | varchar(120) | |
| township_id | bigint NULL FK | last known |

Created implicitly on order. There is no authentication against this table in v1.

### `orders`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| order_number | varchar(16) UNIQUE | `ZW-000123` |
| customer_id | bigint FK | |
| status | varchar(20) | see §3 |
| payment_status | varchar(20) | see §3 |
| payment_method | varchar(20) | `cod` \| `kbzpay` \| `wave` |
| subtotal_mmk | integer | snapshot |
| delivery_fee_mmk | integer | snapshot |
| discount_mmk | integer DEFAULT 0 | |
| total_mmk | integer | snapshot |
| township_id | bigint FK | |
| address_line | text | |
| landmark | varchar(255) | min 5 chars |
| note | text NULL | customer note |
| idempotency_key | varchar(64) NULL UNIQUE | |
| placed_via | varchar(20) | `web` \| `telegram` |
| confirmed_at, packed_at, shipped_at | timestamptz NULL | |
| delivered_at, refused_at, returned_at, cancelled_at | timestamptz NULL | |
| refusal_reason | varchar(30) NULL | see §3.3 |
| cancel_reason | varchar(255) NULL | |

**Snapshot rule:** name, price, and fees are copied at order time. Editing a product or township afterwards must not alter a historical order.

### `order_items`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| order_id | bigint FK | |
| product_id, variant_id | bigint FK | reference only |
| product_name_mm, product_name_en | varchar(200) | snapshot |
| size, color | varchar(40) | snapshot |
| unit_price_mmk | integer | snapshot |
| qty | smallint | ≥ 1 |
| line_total_mmk | integer | |

### `order_events`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | no `updated_at` |
| order_id | bigint FK | |
| from_status | varchar(20) NULL | null on creation |
| to_status | varchar(20) | |
| actor | varchar(20) | `admin` \| `system` \| `bot` \| `customer` |
| reason | varchar(255) NULL | |
| created_at | timestamptz | |

Append-only. Never updated or deleted.

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| order_id | bigint FK | |
| provider | varchar(20) | `cod` \| `kbzpay` \| `wave` |
| provider_ref | varchar(128) NULL UNIQUE | optional wallet transaction ID; one per payment |
| amount_mmk | integer | |
| status | varchar(20) | `pending` \| `paid` \| `failed` \| `refunded` |
| raw_payload | jsonb NULL | receiving-account snapshot (`instructions`, `reference`) and `verification` (`verified_by`, `verified_at`, `note`) |
| paid_at | timestamptz NULL | |

### `payment_proofs`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| order_id | bigint FK | cascade on delete |
| payment_id | bigint FK NULL | null on delete |
| source | varchar(20) | `web` \| `telegram` |
| disk | varchar(20) | `supabase` \| `local` |
| path | varchar(500) | `orders/{order_number}/{uuid}.{ext}` |
| original_name | varchar(255) NULL | customer's file name |
| mime_type | varchar(100) | `image/jpeg`, `image/png`, `application/pdf` |
| size_bytes | unsigned int | ≤ 5 MB |
| status | varchar(20) | `pending` \| `approved` \| `rejected` |
| review_note | text NULL | rejection reason shown to the customer |
| reviewed_by | varchar(40) NULL | `admin` or `telegram:admin` |
| reviewed_at | timestamptz NULL | |
| telegram_file_id | varchar(255) NULL | dedupe key |
| telegram_chat_id, telegram_message_id | bigint NULL | provenance |

Index `(order_id, status)`; UNIQUE `(order_id, telegram_file_id)`. Maximum five receipts per order.

### `shipments`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| order_id | bigint FK | |
| carrier | varchar(80) | |
| tracking_number | varchar(80) NULL | |
| cod_amount_mmk | integer | amount the courier collects |
| dispatched_at, delivered_at | timestamptz NULL | |

### `telegram_sessions`
| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| chat_id | bigint UNIQUE | Telegram chat |
| state | jsonb | `{step, data{}, message_id}` |
| expires_at | timestamptz | 2 hours from last action |

### `settings`
| Column | Type | Notes |
|---|---|---|
| key | varchar(80) PK | |
| value | jsonb | |

Seeded keys: `free_delivery_threshold_mmk` (`80000`), `currency` (`MMK`), `cod_enabled` (`true`), `kbzpay_enabled`, `wave_enabled`, `kbzpay_account_name`, `kbzpay_phone`, `wave_account_name`, `wave_phone`, `return_window_days` (`7`), `support_telegram`, `order_prefix` (`ZW`).

The free-delivery threshold, return window, and support handle are editable at `/admin/settings` (Store tab); the payment flags and wallet accounts live on the Payments tab. Each save bumps the public response cache version. `currency` and `order_prefix` remain fixed for now.

---

## 3. Order State Machine

### 3.1 `orders.status`

```
pending ──► confirmed ──► packed ──► shipped ──► delivered
   │            │           │           │            │
   └────────────┴───────────┴──► cancelled           │
                                │                    │
                                └──► refused ───► returned ◄──┘
```

| From | Allowed to |
|---|---|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `packed`, `cancelled` |
| `packed` | `shipped`, `cancelled` |
| `shipped` | `delivered`, `refused` |
| `delivered` | `returned` (admin judgement; `return_window_days` is customer-facing policy copy, not an API guard) |
| `refused` | `returned` |
| `cancelled` | — terminal |
| `returned` | — terminal |

Any transition outside this table returns **422** and writes no event.

### 3.2 `orders.payment_status`

| From | Allowed to |
|---|---|
| `unpaid` | `paid`, `failed` |
| `paid` | `refunded` |
| `failed` | `unpaid` (retry) |
| `refunded` | — terminal |

COD orders are created `unpaid`. On `delivered`, a COD order flips to `paid` in the same transaction that sets `delivered_at`.

Prepaid orders stay `unpaid` until an admin verifies the transfer. Marking paid writes `payments.status = paid`, `paid_at`, an optional wallet `provider_ref`, and `raw_payload.verification`; it also approves every pending receipt on the order. If the order is still `pending`, verification moves it to `confirmed` in the same transaction (the customer has paid, so the order is real). Already `confirmed` or `packed` orders keep their status. `cancelled`, `refused`, and `returned` orders reject verification. A prepaid order that reaches `returned` becomes `refunded`.

The two statuses stay separate otherwise: an order can be `confirmed` and `unpaid`, or `shipped` and `paid`.

### 3.3 `refusal_reason` values

`wrong_size` · `too_expensive` · `did_not_order` · `unreachable` · `changed_mind` · `other`

This column is the refusal-rate metric. Do not collapse it to a boolean.

### 3.4 Prepaid verification and shipping guard

KBZPay/Wave are **manual prepaid transfers**, not merchant API integrations.

1. Checkout shows the receiving account from settings and snapshots it into `payments.raw_payload.instructions`.
2. The customer transfers the exact total with the order number as the note, then uploads a receipt on the success/tracking page or sends a photo/PDF to the bot.
3. An admin verifies the payment in `/admin/orders/{id}` or presses **Mark paid** on the Telegram alert.
4. `OrderStateMachine` rejects `packed → shipped` with `422` while a prepaid order is not `paid`. COD is unaffected.

Proof files go to the private Supabase Storage bucket `payment-proofs`. The API uses the service-role key, stores `orders/{order_number}/{uuid}.{ext}`, and serves admins a 10-minute signed URL. Railway's filesystem is ephemeral, so production refuses the local disk fallback and returns `503` on upload if Supabase is not configured.

---

## 4. Order Number

- Derived from the primary key inside the order transaction: `'ZW-'.str_pad($id, 6, '0')` → `ZW-000123`.
- No Postgres sequence, so the same code runs on SQLite (local) and Postgres (production).
- Assigned after insert (the row is created, then the number is written back in the same transaction). Gaps are acceptable; reuse is not.
- Contains no PII and no date. Date filtering uses `created_at`.

---

## 5. Tracking Token

Stateless, no column required.

```
payload = order_number + "." + expires_at_unix
token   = base64url(payload) + "." + base64url(hmac_sha256(payload, ORDER_TOKEN_SECRET))
```

- Route: `GET /order/{orderNumber}/{token}` and `GET /api/orders/{orderNumber}/{token}`.
- Lifetime: 90 days from order creation.
- Reject with a rendered "link expired" page, never a 500.
- Response header `Referrer-Policy: no-referrer` on both the page and the API route.
- Rotating `ORDER_TOKEN_SECRET` invalidates all outstanding links — acceptable in v1, note it in the runbook.
- Never log the token. Log the order number only.

---

## 6. Delivery Fee (authoritative algorithm)

Server-side only. Any client-supplied fee is ignored.

```
subtotal = Σ (unit_price_mmk × qty)
fee      = (subtotal >= settings.free_delivery_threshold_mmk)
             ? 0
             : township.delivery_fee_mmk
total    = subtotal + fee - discount
```

Validation before pricing:

1. Township exists and `is_active` — otherwise **422** with the township list.
2. Every variant exists, `is_active`, and `stock_qty >= qty` — otherwise **422** naming the variant.
3. `qty >= 1` and `subtotal > 0`.
4. `total > 0`.

All of the above runs inside one transaction that also decrements stock and creates the order.

---

## 7. Idempotency

- `POST /orders` accepts `Idempotency-Key`. Stored as `orders.idempotency_key` with a UNIQUE constraint.
- Duplicate key ⇒ return the original order with **200**, not a new order and not an error.
- Same key with a different payload ⇒ **409**.
- Payment rows dedupe manual verification on `payments.provider_ref` UNIQUE: the optional wallet transaction ID cannot be reused on another order. There are no merchant callbacks in this release.

---

## 8. Indexes

| Table | Index |
|---|---|
| `orders` | `(status, created_at DESC)`, `(customer_id)`, `(created_at DESC)` |
| `orders` | UNIQUE `order_number`, UNIQUE `idempotency_key` (partial, where not null) |
| `order_items` | `(order_id)` |
| `order_events` | `(order_id, created_at)` |
| `products` | `(is_active, is_featured)`, `(category_id)`, `slug` UNIQUE |
| `product_variants` | `(product_id, stock_qty)` |
| `townships` | `(is_active)`, `(region)` |
| `payments` | `(order_id)`, `provider_ref` UNIQUE |
| `payment_proofs` | `(order_id, status)`, UNIQUE `(order_id, telegram_file_id)` |

Search (`q`) uses a trigram index on `products.name_mm` and `products.name_en` if row count justifies it; otherwise a plain `ILIKE`.

---

## 9. Queue Jobs

| Job | Trigger | Retries |
|---|---|---|
| `SendOrderConfirmation` | order created | 3, backoff 10/60/300s |
| `NotifyAdminNewOrder` | order created | 3 |
| `SendStatusUpdate` | status changed | 3 |
| `PushShipmentToCourier` | `shipped` | v1.1 — stub in v1 |

Failed jobs land in `failed_jobs` and are visible to the admin. A Telegram outage must never lose an order.

---

## 10. Images

- Supabase Storage, public bucket `products`.
- Stored as `product_images.path`; URLs composed at read time.
- Naming: `{product_slug}/{sort_order}-{hash}.webp`.
- Max 1600px on the long edge, WebP, quality 80.
- Next/Image handles resizing and `srcset`.
- Upload is manual in v1 (no admin uploader).

---

## 11. Security & Logging

| Surface | Control |
|---|---|
| Telegram webhook | verify `X-Telegram-Bot-Api-Secret-Token` against `TELEGRAM_WEBHOOK_SECRET`; reject otherwise |
| Admin API | `Authorization: Bearer $ADMIN_TOKEN`, constant-time comparison |
| Admin UI (Next) | `POST /admin/session` validates `ADMIN_PASSWORD`; the Next server sets a signed httpOnly `zw_admin` cookie (HMAC-SHA256, 12 h, `ADMIN_SESSION_SECRET` ≥ 32 chars); 5/min and 20/hour per IP |
| Blade admin (fallback) | HTTP Basic against `ADMIN_PASSWORD`; rate-limited |
| `POST /orders` | 10/min/IP **and** 5/hour/phone |
| Public API | 300/min/IP (named `api` limiter) |
| CORS | allow only the production domain and Vercel preview origins |
| Payment receipts | private Supabase bucket; uploads need the signed tracking token; 5/min/IP; 5 MB; JPG/PNG/PDF only; admin views use a 10-minute signed URL |
| Manual payment verification | admin bearer token or the `TELEGRAM_ADMIN_CHAT_ID` callback check; no customer can mark an order paid |

Logging:

- Structured JSON, one line per request: route **name**, status, duration.
- Redact: phone, address, landmark, tokens, `Authorization` headers, Telegram init payloads.
- Never log a full URL for an order route — it carries the token.
- Sentry: scrub the same fields via `before_send`.

---

## 12. Migration Order

```
001 categories        008 order_items
002 products          009 order_events
003 product_images    010 payments
004 product_variants  011 shipments
005 townships         012 telegram_sessions
006 customers         013 settings
007 orders            014 size_charts
                      015 payment_proofs
```

Seeders, in order: `SettingsSeeder` → `TownshipSeeder` → `CategorySeeder` → `SizeChartSeeder` → `ProductSeeder` (demo catalog, replaced with real catalog before launch).

---

## 13. Open Items

| Item | Owner | Blocks |
|---|---|---|
| Courier partner + served-township list | founder | `townships.csv` content |
| Merchant KBZPay/Wave wallet names and phones | founder | prepaid checkout goes live |
| Private `payment-proofs` bucket + Railway Supabase envs | founder | production receipt upload |
| Return window confirmation (7 days assumed) | founder | `delivered → returned` rule |
| Stack major versions (`V1.md` §6 pins Next 14 / Laravel 11 / PHP 8.2) | founder | M1 scaffolding |

---

## 14. Change Log

| Version | Date | Change |
|---|---|---|
| 1.2 | 2026-10-26 | KBZPay/Wave prepaid transfers with manual verification, private receipt storage, shipping guard, and Telegram proof upload |
| 1.1 | 2026-10-26 | Admin moves to Next.js `/admin` with a signed httpOnly session; Blade admin kept one release as fallback |
| 1.0 | 2026-10-20 | Initial schema, state machine, pricing and token contracts |
