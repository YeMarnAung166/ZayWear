# ZayWear

ZayWear is a localized apparel e-commerce platform for the Myanmar market.
Phone-OTP auth, variant-level catalog, township-based shipping, manual
KBZPay/WavePay slip verification, COD, size-exchange tickets, and Telegram
staff alerts.

See [`DEPLOY.md`](DEPLOY.md) for hosting and [`supabase/SETUP.md`](supabase/SETUP.md)
for auth/storage setup.

## Stack

- **Backend** — FastAPI + SQLModel (sync) + PostgreSQL
- **Frontend** — Next.js 14 App Router + Tailwind CSS
- **Auth / Storage** — Supabase (phone OTP, slip bucket)
- **Alerts** — Telegram Bot API

## Layout

```
backend/  FastAPI app (routers: auth, products, townships, orders, exchanges, admin)
backend/alembic/  Database migrations
backend/scripts/  Ops helpers (telegram_setup.py)
frontend/ Next.js App Router (public / customer / admin)
frontend/e2e/  Playwright end-to-end tests
supabase/ storage.sql + SETUP.md  Storage bucket, RLS, phone-auth guide
```

## Run

```bash
cp .env.example .env          # fill Supabase + Telegram keys
docker compose up --build
```

- Backend → http://localhost:8000 (`/docs` for OpenAPI)
- Frontend → http://localhost:3000

The backend container runs `alembic upgrade head` before booting. To migrate
locally:

```bash
cd backend
alembic upgrade head
```

### Supabase setup

See [`supabase/SETUP.md`](supabase/SETUP.md) — enable the **Phone** provider,
pick an SMS vendor, run [`supabase/storage.sql`](supabase/storage.sql) for the
private `slips` bucket, and copy the project keys into `.env`.

### Telegram alerts

Alerts fire on `slip_uploaded` and `pending_cod`. Create a bot with @BotFather,
then resolve the staff chat id:

```bash
cd backend
$env:TELEGRAM_BOT_TOKEN = "123456:ABC..."
python scripts/telegram_setup.py discover   # prints chat ids
$env:TELEGRAM_CHAT_ID = "-1001234567890"
python scripts/telegram_setup.py test       # sends a test message
```

### Tests

```bash
# backend — unit + integration (SQLite-backed, no services required)
cd backend
pip install -r requirements.txt
pytest

# frontend — e2e (needs backend + Supabase test OTP)
cd frontend
npm install && npx playwright install chromium
npm run test:e2e
```

## API overview

| Area | Prefix | Notes |
|---|---|---|
| Auth | `/auth` | Profile bootstrap/update (phone) |
| Catalog | `/products` | Public reads; admin stock |
| Townships | `/townships` | Public read; admin CRUD |
| Orders | `/orders` | Create, slip upload (multipart) |
| Exchanges | `/exchanges` | Size-exchange tickets |
| Admin | `/admin` | Slips, orders, exchanges |

Order lifecycle: `pending → slip_uploaded → paid → dispatched → delivered`
(COD enters via `pending_cod`).
