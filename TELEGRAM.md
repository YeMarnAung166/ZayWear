# TELEGRAM.md — Bot Specification

**Bot:** `@zaywear_alerts_bot` (`8828017102`)
**Code:** `apps/api/app/Services/TelegramBot.php` (flow), `TelegramClient.php` (Bot API), `Http/Controllers/Api/TelegramController.php` (webhook)
**State:** `telegram_sessions` — one row per chat, 2-hour sliding expiry, pruned hourly

---

## 1. Why a bot

Telegram is a sales channel, not a notification tool. A customer can order without the site, and the bot creates the same order through `OrderCreator` as web checkout — same pricing, stock lock, customer upsert, payment row, and audit event. Such orders carry `placed_via = telegram`. Both COD and prepaid (KBZPay/Wave) orders are supported, including receipt photos and PDFs.

---

## 2. Commands

| Command | Behaviour |
|---|---|
| `/start` | Welcome + product list |
| `/start product_8` | Product deep link, skips to size selection |
| `/start product_8_size_M` | Product + size deep link, skips to quantity |
| `/start pay_ZW-000123` | Prepaid deep link from the storefront; asks for the phone's last four digits, then accepts a receipt |
| `/start login_<nonce>` | Account login deep link from the website. First time: asks for the phone number via a “Share my phone number” keyboard button. Returning chat: sends a 6-digit code the site asks for |
| `/shop`, `/order` | Product list |
| `/pay ZW-000123` | Same prepaid flow as the `pay_` deep link, without the storefront |
| `/status ZW-000123 4567` | Status + tracking link; requires the last four digits of the order's phone |
| `/contact` | Support handle (if configured) and the site contact URL |
| `/cancel` | Abandons the current flow, keeps no order |
| `/help` | Command list |
| `/id` | Echoes the chat id (used to configure admin alerts) |

Commands are registered with `setMyCommands`, so Telegram shows them in the menu.

Account login is a separate, non-ordering flow: the site creates a 15-minute nonce, the customer opens the deep link, and the bot links that chat to `customers.phone`. A contact card is accepted only when `contact.user_id` matches the sender, so a forwarded address-book card cannot claim someone else's number. Once a chat is linked, later logins send a 6-digit OTP instead of asking for the phone again.

---

## 3. Customer order flow

```
/start  →  product  →  size/colour  →  quantity  →  name  →  phone
        →  township  →  address  →  landmark  →  payment method  →  summary  →  confirm
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
| Payment | inline `pm:cod`, `pm:kbzpay`, or `pm:wave` | method must be currently available (flag + account details) |
| Confirm | `ok` / `cancel` | only from `step = confirm` |

The summary shows item, quantity, subtotal, delivery fee (or "free"), total, payment method, name, phone, township, address, and landmark.

Confirming moves the session to `creating` **before** the order transaction, so a double tap cannot create two orders. A COD order replies with the order number, total, 1–3 day estimate, and a signed tracking link. A prepaid order replies with the receiving account, amount, order-number reference, a tracking link, and asks for a receipt in the same chat.

---

## 4. Callback namespaces

| Prefix | Owner | Meaning |
|---|---|---|
| `p:` | customer | select product |
| `v:` | customer | select variant |
| `q:` | customer | select quantity |
| `t:` | customer | select township |
| `pm:` | customer | select payment method (`cod`, `kbzpay`, `wave`) |
| `back:` | customer | return to product list |
| `ok` / `cancel` | customer | confirm / abandon |
| `adm:confirm:{orderId}` | admin only | confirm the order |
| `adm:cancel:{orderId}` | admin only | cancel the order |
| `adm:paid:{orderId}` | admin only | mark a prepaid payment received |

Admin callbacks are checked against `TELEGRAM_ADMIN_CHAT_ID` **before** the order is touched. A customer chat pressing an `adm:` button is answered with `Not allowed.` and changes nothing. A successful action edits the alert in place to append the new status.

---

## 5. Admin alerts

When `TELEGRAM_ADMIN_CHAT_ID` is set, every new order sends:

- order number, customer name and phone, township, address, landmark
- line items with size, colour, and quantity
- total and payment method; a prepaid order also says whether payment has been received
- **Confirm** / **Cancel** buttons, a **Mark paid** button while a prepaid order is unpaid, and a **View order** link to `/admin/orders/{id}`

The view link uses `FRONTEND_URL`, so it opens the Next.js admin. That page needs an admin session; the Telegram chat itself is the authentication for the buttons.

When a receipt arrives — from the website or Telegram — the admin chat gets a second alert with the order number, customer, method, amount, source, and the receipt itself (photo, PDF, or a text summary if Telegram will not re-send the file). It carries **Mark paid** and **View order** buttons.

Alerts currently go to the founder's private chat. Create a Telegram group, add the bot, send `/id`, and set the group's id as `TELEGRAM_ADMIN_CHAT_ID` to separate alerts from customer conversations.

---

## 6. Prepaid receipts

Prepaid orders can send a receipt without the website:

```
https://t.me/<bot>?start=pay_ZW-000123
/pay ZW-000123
```

1. The bot asks for the last four digits of the order's phone number. Order numbers are sequential, so this gate prevents a stranger from reading the amount or receiving account.
2. Wrong digits get two retries; the third sends the chat back to idle and asks the customer to run `/pay` again.
3. Correct digits show the amount, KBZPay/Wave account name, phone, and the order number to use as the transfer note, then ask for a photo or PDF.
4. Accepted files: JPG, PNG, PDF; maximum 5 MB; maximum five receipts per order. A repeated `telegram_file_id` is ignored and answered with “already received”.
5. The customer gets a receipt confirmation; the admin chat gets the proof alert with **Mark paid**.

Only a prepaid, unpaid order in `pending`, `confirmed`, or `packed` accepts a receipt. Paid orders and `cancelled`/`refused`/`returned` orders are refused. The customer can never mark an order paid — only an admin in the chat or the Next.js admin can.

---

## 7. Status lookup privacy

Order numbers are sequential, so `/status` requires the last four digits of the order's phone:

```
/status ZW-000123 4567
```

- Missing digits → explains the syntax, reveals nothing.
- Wrong digits or unknown number → the same generic "not found" message, so numbers cannot be enumerated.
- Correct pair → status, total, and a freshly signed tracking link.

---

## 8. Webhook setup

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

## 9. Environment

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot API token. **Rotate before production** — the current one was shared in chat. |
| `TELEGRAM_BOT_USERNAME` | Public handle, returned by `/api/config` and used in links |
| `TELEGRAM_WEBHOOK_SECRET` | Must match the `secret_token` set on the webhook |
| `TELEGRAM_ADMIN_CHAT_ID` | Where order alerts go; empty disables alerts |
| `TELEGRAM_CA_BUNDLE` | Optional CA file for local TLS-inspecting proxies; leave empty in production |
| `FRONTEND_URL` | Used to build tracking links, contact links, and the **View order** admin link |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Private receipt storage shared with the website; production uploads fail without them |

`TelegramClient` logs API failures (with the Bot API description) rather than throwing, so a delivery failure never breaks the webhook.

---

## 10. Failure modes seen locally

- **`cURL error 60: self-signed certificate in certificate chain`** — a local proxy intercepts TLS. Export the Windows roots to `storage/app/cacert.pem` and set `TELEGRAM_CA_BUNDLE` to that path.
- **Webhook silently dead** — check `getWebhookInfo` for `last_error_message`; usually the tunnel host is not running or the secret was changed without re-registering.
- **`429` from the API** while testing orders — rate limiting, not Telegram. `php artisan cache:clear`.
- **Receipt upload answers “ပြေစာ သိမ်းဆည်း၍ မရပါ”** — `SUPABASE_*` is missing, the bucket is not `payment-proofs`, or the service-role key is wrong. The same failure makes the website return `503`.
- **`/pay` refuses the order** — only prepaid, unpaid, open orders accept a receipt; COD and paid/closed orders are rejected by design.
- **Bot answers "ဒီပစ္စည်း မရှိတော့ပါ"** — the deep link points at an inactive product or a mock id that no longer exists.
