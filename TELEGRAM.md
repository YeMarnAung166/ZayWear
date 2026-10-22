# TELEGRAM.md — Bot Specification

**Bot:** `@zaywear_alerts_bot` (`8828017102`)
**Code:** `apps/api/app/Services/TelegramBot.php` (flow), `TelegramClient.php` (Bot API), `Http/Controllers/Api/TelegramController.php` (webhook)
**State:** `telegram_sessions` — one row per chat, 2-hour sliding expiry, pruned hourly

---

## 1. Why a bot

Telegram is a sales channel, not a notification tool. A customer can order without the site, and the bot creates the same COD order through `OrderCreator` as web checkout — same pricing, stock lock, customer upsert, payment row, and audit event. Such orders carry `placed_via = telegram`.

---

## 2. Commands

| Command | Behaviour |
|---|---|
| `/start` | Welcome + product list |
| `/start product_8` | Product deep link, skips to size selection |
| `/start product_8_size_M` | Product + size deep link, skips to quantity |
| `/shop`, `/order` | Product list |
| `/status ZW-000123 4567` | Status + tracking link; requires the last four digits of the order's phone |
| `/contact` | Support handle (if configured) and the site contact URL |
| `/cancel` | Abandons the current flow, keeps no order |
| `/help` | Command list |
| `/id` | Echoes the chat id (used to configure admin alerts) |

Commands are registered with `setMyCommands`, so Telegram shows them in the menu.

---

## 3. Customer order flow

```
/start  →  product  →  size/colour  →  quantity  →  name  →  phone
        →  township  →  address  →  landmark  →  summary  →  confirm
```

| Step | Input | Validation |
|---|---|---|
| Product | inline button `p:{id}` | product must be active and have stock |
| Size/colour | inline button `v:{variantId}` | variant active, `stock_qty >= 1` |
| Quantity | buttons `q:1`…`q:5`, or typed number | `1 … min(stock, 20)` |
| Name | text | 2–120 characters |
| Phone | text | `+959…` normalises to `09…`; `^09[0-9]{7,9}$` |
| Township | inline `t:{id}` or typed search | must be active |
| Address | text | 5–500 characters |
| Landmark | text | 5–255 characters |
| Confirm | `ok` / `cancel` | only from `step = confirm` |

The summary shows item, quantity, subtotal, delivery fee (or "free"), COD total, name, phone, township, address, and landmark.

Confirming moves the session to `creating` **before** the order transaction, so a double tap cannot create two orders. Success replies with the order number, total, 1–3 day estimate, and a signed tracking link.

---

## 4. Callback namespaces

| Prefix | Owner | Meaning |
|---|---|---|
| `p:` | customer | select product |
| `v:` | customer | select variant |
| `q:` | customer | select quantity |
| `t:` | customer | select township |
| `back:` | customer | return to product list |
| `ok` / `cancel` | customer | confirm / abandon |
| `adm:confirm:{orderId}` | admin only | confirm the order |
| `adm:cancel:{orderId}` | admin only | cancel the order |

Admin callbacks are checked against `TELEGRAM_ADMIN_CHAT_ID` **before** the order is touched. A customer chat pressing an `adm:` button is answered with `Not allowed.` and changes nothing. A successful action edits the alert in place to append the new status.

---

## 5. Admin alerts

When `TELEGRAM_ADMIN_CHAT_ID` is set, every new order sends:

- order number, customer name and phone, township, address, landmark
- line items with size, colour, and quantity
- COD total
- **Confirm** / **Cancel** buttons, plus a **View order** link to `/admin/orders/{id}`

The view link uses `APP_URL`, so it points at the Blade admin (HTTP Basic protected — the browser will prompt).

Alerts currently go to the founder's private chat. Create a Telegram group, add the bot, send `/id`, and set the group's id as `TELEGRAM_ADMIN_CHAT_ID` to separate alerts from customer conversations.

---

## 6. Status lookup privacy

Order numbers are sequential, so `/status` requires the last four digits of the order's phone:

```
/status ZW-000123 4567
```

- Missing digits → explains the syntax, reveals nothing.
- Wrong digits or unknown number → the same generic "not found" message, so numbers cannot be enumerated.
- Correct pair → status, total, and a freshly signed tracking link.

---

## 7. Webhook setup

**Development (local machine + tunnel):**

```bash
npx localtunnel --port 8000 --subdomain zaywear-zw
curl "https://api.telegram.org/bot$TOKEN/setWebhook" \
  -d "url=https://zaywear-zw.loca.lt/api/telegram/webhook" \
  -d "secret_token=$SECRET"
```

**Production:** point `url` at the Railway host and delete the tunnel webhook afterwards.

Check state any time:

```bash
curl "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
```

The webhook verifies the secret header and returns `200` even on handled errors so Telegram does not retry a poison update. Handler exceptions are logged (`telegram.handler.failed`) instead of surfacing to the customer.

---

## 8. Environment

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot API token. **Rotate before production** — the current one was shared in chat. |
| `TELEGRAM_BOT_USERNAME` | Public handle, returned by `/api/config` and used in links |
| `TELEGRAM_WEBHOOK_SECRET` | Must match the `secret_token` set on the webhook |
| `TELEGRAM_ADMIN_CHAT_ID` | Where order alerts go; empty disables alerts |
| `TELEGRAM_CA_BUNDLE` | Optional CA file for local TLS-inspecting proxies; leave empty in production |
| `FRONTEND_URL` | Used to build tracking and contact links |

`TelegramClient` logs API failures (with the Bot API description) rather than throwing, so a delivery failure never breaks the webhook.

---

## 9. Failure modes seen locally

- **`cURL error 60: self-signed certificate in certificate chain`** — a local proxy intercepts TLS. Export the Windows roots to `storage/app/cacert.pem` and set `TELEGRAM_CA_BUNDLE` to that path.
- **Webhook silently dead** — check `getWebhookInfo` for `last_error_message`; usually the tunnel host is not running or the secret was changed without re-registering.
- **`429` from the API** while testing orders — rate limiting, not Telegram. `php artisan cache:clear`.
- **Bot answers "ဒီပစ္စည်း မရှိတော့ပါ"** — the deep link points at an inactive product or a mock id that no longer exists.
