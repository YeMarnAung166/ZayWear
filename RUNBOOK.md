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
- Admin (HTTP Basic, `ADMIN_PASSWORD` in `apps/api/.env`): <http://127.0.0.1:8000/admin/orders>
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

Current baseline: **30 tests / 176 assertions**, lint and build green.

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

### Settings

Shipping fee threshold, payment flags, return window, and the support handle live in `settings`:

```sql
select key, value from settings;
```

Change them with `php artisan tinker` or a small seeder update, then clear the API cache if values look stale:

```powershell
php artisan cache:clear
```

---

## 3. Deploy checklist

Nothing here can be done until the hosting accounts and domain exist. Order matters.

### 3.1 Supabase (Postgres + Storage)

1. Create the project, copy the pooler connection string.
2. Use `DB_CONNECTION=pgsql`, `DB_SSLMODE=require`.
3. Create a public Storage bucket for product images (later; V1 uses local SVGs).
4. Run `php artisan migrate --force` once from the API host.

### 3.2 Railway (API)

Environment:

```
APP_ENV=production
APP_KEY=<php artisan key:generate --show>
APP_URL=https://<api-host>
FRONTEND_URL=https://<web-host>
CORS_ALLOWED_ORIGINS=https://<web-host>
DB_CONNECTION=pgsql
DB_HOST=... DB_PORT=5432 DB_DATABASE=... DB_USERNAME=... DB_PASSWORD=... DB_SSLMODE=require
ADMIN_TOKEN=<random 32+ chars>
ADMIN_PASSWORD=<strong password>
ORDER_TOKEN_SECRET=<random 32+ chars>
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=zaywear_alerts_bot
TELEGRAM_WEBHOOK_SECRET=<random 32+ chars>
TELEGRAM_ADMIN_CHAT_ID=...
QUEUE_CONNECTION=database
SESSION_DRIVER=database
CACHE_STORE=database
SENTRY_DSN=...
```

Then:

1. `php artisan migrate --force`
2. `php artisan db:seed --class=SettingsSeeder --force`
3. Import townships with `--deactivate-missing`
4. Load the real catalog and images
5. Add the scheduler: `* * * * * cd /app && php artisan schedule:run >> /dev/null 2>&1`
6. Add a queue worker if `QUEUE_CONNECTION=database`

### 3.3 Vercel (web)

Set **before** the first build (Next inlines `NEXT_PUBLIC_*`):

```
NEXT_PUBLIC_API_URL=https://<api-host>/api
NEXT_PUBLIC_IMAGE_BASE=https://<storage-host>/products   # or /mock until real images
NEXT_PUBLIC_USE_MOCK=            # must stay empty
```

### 3.4 Telegram

```bash
curl "https://api.telegram.org/bot$TOKEN/setWebhook" \
  -d "url=https://<api-host>/api/telegram/webhook" \
  -d "secret_token=$SECRET"
```

Then delete the tunnel webhook by re-registering only the production URL, and confirm `getWebhookInfo` shows no `last_error_message`.

### 3.5 Final gates

- Storefront loads with the production API; **no mock products** appear.
- `POST /orders` from the production origin succeeds (CORS list correct).
- Bot order creates a real order and the admin alert arrives with working buttons.
- Admin Blade reachable with the password and not with the old one.
- Tracking link opens from a phone and shows `no-referrer`.
- `NEXT_PUBLIC_USE_MOCK` absent from the Vercel build.

---

## 4. Routine operations

### Move an order

Prefer the Telegram alert buttons or `/admin/orders/{id}`. Both use the same state machine and write an `order_events` row.

Valid path: `pending → confirmed → packed → shipped → delivered`.
Terminal alternatives: `cancelled`, `refused`, `returned`.
COD flips to `paid` on `delivered`; a non-COD `returned` becomes `refunded`.

### Check the API without a browser

```powershell
curl.exe -s https://<api-host>/api/config
curl.exe -s -H "Authorization: Bearer $ADMIN_TOKEN" https://<api-host>/api/admin/metrics
```

### Rotate the Telegram token

1. BotFather → `/revoke` → copy the new token.
2. Update `TELEGRAM_BOT_TOKEN` in Railway (and local `.env`).
3. Re-register the webhook with the new token; the secret does not change.
4. Send `/start` and confirm `getWebhookInfo` is clean.

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
| Site shows placeholder products in production | `NEXT_PUBLIC_USE_MOCK=1` in the Vercel build | Remove it and rebuild |
| Burmese text looks like `?????` in a terminal | Console encoding, not the data | Check with `curl` or the browser, not PowerShell `Get-Content` |

---

## 6. Backups

- Supabase: enable daily backups before launch; test one restore into a scratch project.
- Export orders weekly during the first month:
  ```sql
  copy (select * from orders order by id) to stdout with csv header;
  ```
- Keep `database/data/townships.csv` and the product CSV in git; they are the reproducible seed.
