# RUNBOOK.md — Operating ZayWear

Paths are relative to the repo root: `apps/api` (Laravel), `apps/web` (Next.js), `database/data` (import files).

---

## 1. Local development

Three processes:

```powershell
# 1. API
cd apps/api
php artisan serve --host=127.0.0.1 --port=8000

# 2. Storefront
cd apps/web
npm run dev

# 3. Public webhook (only needed for the Telegram bot)
npx localtunnel --port 8000 --subdomain zaywear-zw
```

- Storefront: <http://127.0.0.1:3000>
- API: <http://127.0.0.1:8000>
- Admin: <http://localhost:3000/admin> (`ADMIN_PASSWORD` in `apps/api/.env`; set `ADMIN_TOKEN` and `ADMIN_SESSION_SECRET` in `apps/web/.env.local`)
- Blade admin fallback (HTTP Basic): <http://127.0.0.1:8000/admin/orders>
- Tunnel: `https://zaywear-zw.loca.lt`

Local DB is SQLite at `apps/api/database/database.sqlite`.

### Checks before committing

```powershell
cd apps/api
vendor/bin/pint --dirty --format agent
php artisan test --compact

cd ..\web
npm run lint
npm run build
```

Current baseline: **87 tests / 793 assertions**, lint and build green.

### 1.1 Verify locally in 10 minutes

Load verification data once (demo orders are tagged `placed_via = demo` and never seeded by default):

```powershell
cd apps/api
php artisan migrate:fresh --seed
php artisan db:seed --class=DemoOrderSeeder
```

The seeder prints ten orders covering every status plus signed tracking URLs.

| # | Open | Expect |
|---|---|---|
| 1 | <http://localhost:3000> | Burmese home, product grid, no English-only gaps |
| 2 | A product page | Out-of-stock sizes disabled; selecting a size makes the Telegram CTA point at that size |
| 3 | Cart | Line, quantity cap, free-delivery nudge |
| 4 | Checkout | Township fee appears inline; COD selected by default; prepaid methods appear only when enabled and configured |
| 5 | Place the order | Success page with `ZW-…` and a working **Copy tracking link** |
| 6 | The tracking link | Timeline, masked phone, fee/total breakdown |
| 7 | <http://127.0.0.1:8000/admin/orders> | Ten demo orders, counts per status, refresh notice |
| 8 | `ZW-000010` detail | Refused, reason `unreachable`, shipment number, event history |
| 9 | Confirm a pending order | Status moves to `confirmed`; `delivered → pending` returns `422` |
| 10 | `/admin/metrics` | Refusal rate, median delivery hours, revenue |
| 11 | Bot `/start` | Catalogue; `/start product_8_size_M` skips to quantity; complete one order |
| 12 | Bot `/status ZW-000003 0000` then `4567` | First is refused; second returns status + link |
| 13 | `php artisan townships:import ../../database/data/townships.example.csv --dry-run` | "9 row(s) validated", nothing written |

The local `.env` raises `ORDER_RATE_LIMIT_PER_MINUTE` to 120 so a verification run does not hit `429`; production stays at 10. If a limit is hit anyway, `php artisan cache:clear` resets counters.

Use `localhost`, never `127.0.0.1`, in the browser: Next 16 only sends dev assets to allowed origins, and a blocked origin renders the page without hydrating it, so every button is inert. `apps/web/next.config.ts` already allows `127.0.0.1` and `192.168.1.17`; add the current LAN IP there for phone testing.

### 1.2 Verify prepaid checkout locally

Local receipts use `storage/app/private` and a short-lived signed route, so no Supabase project is needed.

1. Sign in at <http://localhost:3000/admin/settings?tab=payments>.
2. Enable **KBZPay**, enter an account name and a `09…` phone, and save.
3. Checkout: KBZPay is now offered and the helper shows the same account. Place the order.
4. On the success page, upload a JPG/PNG/PDF receipt (≤ 5 MB). The proof list shows **Under review**.
5. Open the order in `/admin/orders/{id}`. **View receipt** opens the private file; **Reject this receipt** requires a reason and the customer sees it on the order page.
6. Upload again, then **Mark payment received**. The order moves `pending → confirmed` and every pending receipt becomes approved.
7. Try `packed → shipped` while a second prepaid order is still unpaid: the API returns `422` and the admin shows the warning. Mark it paid, then ship.
8. Telegram: open `https://t.me/<bot>?start=pay_ZW-000123`, enter the phone's last four digits (three attempts), send a receipt photo or PDF, then press **Mark paid** on the admin alert.

---

## 2. Data operations

### Import the real township list

The importer expects a UTF-8 CSV (Excel: save as **CSV UTF-8**) with this header:

```csv
region,name_mm,name_en,delivery_fee_mmk,is_active
Yangon,ဗဟန်း,Bahan,1500,1
Mandalay,ချမ်းအေးသာစံ,Chanayethazan,2500,1
```

```powershell
cd apps/api
php artisan townships:import database/data/townships.csv --dry-run
php artisan townships:import database/data/townships.csv --deactivate-missing
```

- Succeeds only if **every** row is valid; on failure nothing is written.
- Upserts by `region` + `name_en`, so re-running with updated fees is safe.
- `--deactivate-missing` turns off townships that are no longer served — this is how the 41 mock rows disappear on data day. Orders keep their snapshotted fee and township relation.
- Rows with `is_active = 0` are imported but hidden from the site and bot.

### Reset the local database

```powershell
cd apps/api
php artisan migrate:fresh --seed
```

This **deletes local orders**. Never run it against production.

### Reset the demo orders only

```powershell
cd apps/api
php artisan tinker --execute "App\Models\Order::where('placed_via', 'demo')->delete();"
php artisan db:seed --class=DemoOrderSeeder
```

Demo orders never move stock and are never created by `migrate:fresh --seed`.

### Settings

Shipping fee threshold, payment flags and receiving accounts, return window, and the support handle live in `settings`:

```sql
select key, value from settings;
```

Change them at `/admin/settings`: the **Payments** tab holds the method flags and receiving accounts, and the **Store** tab holds the free-delivery threshold, return window, and support handle. Each save invalidates the public response cache. The old `/admin/settings/payments` URL redirects to the Payments tab. Other keys can still be changed with `php artisan tinker` or a small seeder update, then clear the API cache if values look stale:

```powershell
php artisan cache:clear
```

---

## 3. Deploy checklist

Repo artifacts that support this: `apps/api/Dockerfile`, `apps/api/docker/` (Apache vhost, PHP ini, start script), `apps/api/railway.json`, `apps/web/vercel.json`, both `.env.production.example` files, and `scripts/backup-db.ps1`, `restore-db.ps1`, `smoke-test.ps1`.

### 3.1 Supabase (database + storage)

1. Create the project in **Tokyo (`ap-northeast-1`)**. The Singapore migration is cancelled; keep the database and storage together.
2. **Connect** → copy the **session pooler** details: host, port `5432`, user `postgres.<ref>`, password, database `postgres`. Keep `DB_SSLMODE=require`.
3. **Storage** → create a **private** bucket named `payment-proofs`. Do not add a public read policy: the API uploads with the service-role key and admins view receipts through 10-minute signed URLs.
4. Copy the **Project URL** and **service_role** key for Railway: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET=payment-proofs`. The service-role key is server-only; never put it in Vercel or the storefront.
5. No local migration needed: the first Railway deploy runs `php artisan migrate --force`.
6. Store the session-pooler URL locally as `SUPABASE_DB_URL` for backups. Never commit it.
7. The transaction pooler (`6543`) is optional later; session mode is what migrations, `pg_dump` and `pg_restore` need.

### 3.2 Railway (API)

1. New project → **Deploy from GitHub** → set the service root directory to `apps/api`. Railway reads `railway.json` and builds the `Dockerfile`.
2. Add the variables from `apps/api/.env.production.example`:
   - `APP_KEY` ← `php artisan key:generate --show`
   - `ADMIN_PASSWORD`, `ADMIN_TOKEN`, `ORDER_TOKEN_SECRET` ← new random 64-char values (not the local defaults)
   - `DB_*` from Supabase, `DB_SSLMODE=require`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=payment-proofs` for receipt storage
   - `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` ← the Vercel domain (fill after 3.3)
   - `TELEGRAM_*` ← the current token/secret (rotate first if it ever leaked)
3. Deploy. The container runs `php artisan migrate --force` at start (see `docker/start.sh`) — Railway's config-as-code no longer applies `preDeployCommand` for this service, so boot-time migration is the source of truth. The healthcheck is `/api/config`, which also proves the DB connection.
4. Seed base data **once**:
   ```powershell
   cd apps/api
   railway link
   railway run php artisan db:seed --force
   ```
   This creates settings, townships, categories, products and size charts. Never run `DemoOrderSeeder` in production.
5. Do not add a queue worker (`QUEUE_CONNECTION=sync`). The session-prune schedule is optional housekeeping; the bot already ignores expired sessions.

### 3.3 Vercel (web)

1. From the repo root, link once: `npx vercel link` and choose `zay-wear`. The project's Root Directory is `apps/web`, so always deploy from the repo root, not from `apps/web`.
2. Set the variables from `apps/web/.env.production.example` **before the first build**:
   - `NEXT_PUBLIC_API_URL=https://<api>/api`
   - `NEXT_PUBLIC_IMAGE_BASE=/mock` (switch to the CDN when real photos land)
   - `NEXT_PUBLIC_USE_MOCK` unset — a production build fails if it is `1`
   - `ADMIN_TOKEN` — the same value as Railway's `ADMIN_TOKEN`
   - `ADMIN_SESSION_SECRET` — at least 32 random characters; rotating it signs every admin out
3. Deploy from the repo root: `npx vercel --prod`. The project is not Git-connected, so a push alone does not deploy the web app.
4. Put the production domain into Railway's `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` and redeploy the API.
5. `apps/web/vercel.json` pins the Singapore region.

### 3.4 Telegram

```powershell
curl.exe -s -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" --data-urlencode "url=https://<api>/api/telegram/webhook" --data-urlencode "secret_token=$SECRET" --data-urlencode "drop_pending_updates=true"
```

Verify `getWebhookInfo` shows `pending=0` and no `last_error`, then send `/start`. Keep the localtunnel running until the production order test passes; only then stop it.

### 3.5 Final gates

Run the smoke test:

```powershell
.\scripts\smoke-test.ps1 -ApiBase https://<api>/api -WebBase https://<web> -AdminPassword '<password>'
```

Then, by hand:

- Place a real COD order from the Vercel site. Tracking link, admin detail, and Telegram alert must all work.
- Sign in at `https://<web>/admin`, confirm the order, attach a shipment, and move it to delivered.
- Open `/admin/settings?tab=payments`, enable KBZPay and Wave with the real merchant account names and phones, and save.
- Open `/admin/settings?tab=store` and check the free-delivery threshold, return window, and support handle.
- Place a real prepaid order from the Vercel site. Upload a receipt on the success page, then reject it from the admin; the customer must see the reason. Upload again, mark it paid, and confirm the order auto-confirms. `packed → shipped` must be blocked until payment is verified.
- Send `/start pay_ZW-000123` to the bot from the customer's phone, enter the last four digits, upload a photo receipt, and press **Mark paid** on the admin alert.
- Place one order from the bot on your phone.
- Confirm no mock products appear (`NEXT_PUBLIC_USE_MOCK` unset).
- `getWebhookInfo` points at Railway, not the tunnel.

### 3.6 Rollback

Take a backup before every migration or data import:

```powershell
$env:SUPABASE_DB_URL = "postgresql://..."
.\scripts\backup-db.ps1
```

| Failure | Rollback |
|---|---|
| Bad storefront deploy | Vercel → Deployments → previous deployment → **Promote to Production**. No data change. |
| Bad API deploy | Railway → Deployments → previous build → **Redeploy**. If its migration already ran, treat it as a data incident below. |
| Bad migration, import, or data | `php artisan down --secret=<token>` on the API → restore with `.\scripts\restore-db.ps1 -File .\backups\<file>.dump -Confirm` → smoke test → `php artisan up`. |
| Bot broken after cutover | Point the webhook back at the tunnel and restore the previous token in `.env`/Railway. Rotate tokens only after production is verified. |

`restore-db.ps1` runs `pg_restore --clean`, which drops objects. Never restore while orders are being written — put the API in maintenance mode first.


---

## 4. Routine operations

### Move an order

Prefer the Telegram alert buttons or `/admin/orders/{id}`. Both use the same state machine and write an `order_events` row.

Valid path: `pending → confirmed → packed → shipped → delivered`.
Terminal alternatives: `cancelled`, `refused`, `returned`.
COD flips to `paid` on `delivered`; a non-COD `returned` becomes `refunded`.

### Verify a prepaid payment

1. Open `/admin/orders/{id}` and compare the receipt with the wallet app.
2. **View receipt** opens a 10-minute signed URL. The proof row shows the source (website or Telegram), time, and size.
3. Enter the wallet transaction ID if you have one (it cannot be reused on another order), then **Mark payment received**.
4. The order becomes `confirmed` if it was `pending`; pending receipts are approved. The customer sees the paid state on their order page.
5. If the transfer never arrived, reject the receipt with a reason. The customer can upload another one, up to five per order.

Shipping a prepaid order is blocked until payment is `paid`. The same action is available as **Mark paid** on the Telegram order/proof alert.

### Change settings

`/admin/settings` controls the storefront, the footer, the bot, and the returns policy.

- **Payments** tab: COD/KBZPay/Wave flags and receiving accounts. Enabling KBZPay or Wave requires an account name and a valid `09…` phone; at least one method must stay usable. The receiving account is snapshotted onto each new order, so later changes do not rewrite existing instructions.
- **Store** tab: free-delivery threshold (`0` makes every order free), return window in days, and the support Telegram handle used on the contact page and in the bot help.

Both tabs save independently and invalidate the public API cache immediately. `/admin/settings/payments` redirects to the Payments tab.

### Check the API without a browser

```powershell
curl.exe -s https://<api-host>/api/config
curl.exe -s -H "Authorization: Bearer $ADMIN_TOKEN" https://<api-host>/api/admin/metrics
```

### Rotate the Telegram token

Do this whenever the token may have leaked, and rotate `TELEGRAM_WEBHOOK_SECRET` in the same pass.

1. BotFather → `/revoke` → copy the new token.
2. Put it in `apps/api/.env` (`TELEGRAM_BOT_TOKEN=...`) and in Railway → Variables. Never commit it.
3. Generate a new webhook secret (64 hex chars) and set `TELEGRAM_WEBHOOK_SECRET` in both places.
4. `php artisan config:clear` locally; Railway restarts on its own.
5. Re-register the webhook with the new secret:

```powershell
$token = (Get-Content apps/api/.env | Select-String '^TELEGRAM_BOT_TOKEN=').Line -replace '^TELEGRAM_BOT_TOKEN=', ''
$secret = (Get-Content apps/api/.env | Select-String '^TELEGRAM_WEBHOOK_SECRET=').Line -replace '^TELEGRAM_WEBHOOK_SECRET=', ''
curl.exe -s -X POST "https://api.telegram.org/bot$token/setWebhook" --data-urlencode "url=https://<api-host>/api/telegram/webhook" --data-urlencode "secret_token=$secret" --data-urlencode "drop_pending_updates=true"
```

6. Verify: `getWebhookInfo` shows the right URL, `pending=0`, no `last_error`; the endpoint answers `401` with a wrong secret header and `200` with the right one; `sendMessage` to the admin chat succeeds; send `/start` from your phone.

Revoking invalidates outgoing calls immediately but leaves the webhook registered, so the bot keeps receiving updates and cannot answer until the new token is in `.env`.

### Prune bot sessions

Automatic hourly via `model:prune`. Manually:

```powershell
php artisan model:prune --model="App\Models\TelegramSession"
```

---

## 5. Incidents

| Symptom | Likely cause | Fix |
|---|---|---|
| Checkout `429` | Order limiter (10/min per IP) | Wait a minute, or `php artisan cache:clear` locally |
| Browser blocks `POST /orders` (CORS) | Storefront origin missing from `CORS_ALLOWED_ORIGINS` | Add it and redeploy the API |
| Tracking link `403` | Token expired (90 days) or `ORDER_TOKEN_SECRET` changed | Reissue from the order; never rotate the secret without accepting that old links die |
| Bot silent | Tunnel down, wrong webhook URL, or secret mismatch | `getWebhookInfo`; re-run `setWebhook` |
| Bot `cURL error 60` locally | TLS-inspecting proxy | `TELEGRAM_CA_BUNDLE=storage/app/cacert.pem` |
| Orders exist but no admin alert | `TELEGRAM_ADMIN_CHAT_ID` empty or bot not in the group | Send `/id`, update the env, redeploy |
| Prepaid receipt upload returns `503` | `SUPABASE_*` missing on Railway or the bucket is not private/exists | Create `payment-proofs`, set the three vars, redeploy |
| **View receipt** 404 | Storage object missing or signed URL failed | Check the API log (`payment-proof.sign.failed`); the customer can send the receipt on Telegram |
| `422` on `packed → shipped` | Prepaid order is still unpaid | Verify the transfer and **Mark payment received** first |
| KBZPay/Wave missing at checkout | Flag off or account name/phone incomplete | Fix `/admin/settings?tab=payments`; effective availability needs all three |
| Site shows placeholder products in production | `NEXT_PUBLIC_USE_MOCK=1` in the Vercel build | Remove it and rebuild |
| Burmese text looks like `?????` in a terminal | Console encoding, not the data | Check with `curl` or the browser, not PowerShell `Get-Content` |
| Sentry shows no events | DSN missing or the release never deployed | Check `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`, then `php artisan sentry:test` from a host that can reach Sentry |

---

## 6. Backups

- Before every migration, seed, or township import: `.\scripts\backup-db.ps1` (reads `SUPABASE_DB_URL`). Keep one copy off this machine.
- Restore only deliberately: `.\scripts\restore-db.ps1 -File .\backups\<file>.dump -Confirm`, with the API in maintenance mode. Test one restore into a scratch project before launch.
- Supabase keeps automated backups; confirm the retention on the chosen plan and never rely on them alone.
- GitHub Actions runs `Nightly database backup` at 18:00 UTC (00:30 Asia/Yangon) and keeps seven daily artifacts. Add the Supabase session-pooler URL (port 5432) as the repository secret `SUPABASE_DB_URL`. The job installs the PostgreSQL 17 client because Supabase runs 17 and `pg_dump` refuses newer servers.
- GitHub Actions runs `Uptime` every 15 minutes against `/up`, `/api/config` and the storefront. A failed run emails the repository owner; add UptimeRobot/BetterStack on the same URLs if you want SMS.
- Export orders weekly in the first month:
  ```sql
  copy (select * from orders order by id) to stdout with csv header;
  ```
- Keep `database/data/townships.csv` and the product CSV in git; they are the reproducible seed.
