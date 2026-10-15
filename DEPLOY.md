# Deploying ZayWear online

Target architecture:

| Layer | Service | Purpose |
|---|---|---|
| Database / Auth / Storage | **Supabase** | Postgres, email-OTP auth, `slips` bucket |
| Backend API | **Render** (Docker) | FastAPI + SQLModel |
| Frontend | **Vercel** | Next.js App Router |

Alternatives for the backend: **Railway** or **Fly.io** — the `backend/Dockerfile`
works as-is (it runs `alembic upgrade head` before booting).

---

## 1. Supabase

1. Create a project (region near Myanmar, e.g. Singapore).
2. **Project Settings → API** — copy:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` **(secret, backend only)**
3. **Project Settings → Database → Connection string → Shared pooler** — copy the URI:
   ```
   postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   The backend uses the psycopg driver, so prefix it with `+psycopg`:
   ```
   postgresql+psycopg://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   Percent-encode special characters in the password (`@ : / ? # & %`).
4. **Authentication → Providers → Email** — enable, and add `{{ .Token }}` to
   the **Magic Link** template so the 6-digit code flow works. Add custom SMTP
   for production (the built-in mailer is dev-only). See
   [`supabase/SETUP.md`](../supabase/SETUP.md).
5. **SQL Editor** — run [`supabase/storage.sql`](../supabase/storage.sql).

> `SUPABASE_JWT_SECRET` is unused by the code (auth verifies via JWKS). Omit it.

---

## 2. Backend → Render

1. Push the repo to GitHub.
2. Render → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Docker
4. Environment variables:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the `postgresql+psycopg://...:6543/postgres` URI |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
   | `SUPABASE_STORAGE_BUCKET` | `slips` |
   | `TELEGRAM_BOT_TOKEN` | *(optional)* |
   | `TELEGRAM_CHAT_ID` | *(optional)* |
   | `CORS_ORIGINS` | `["https://<your-app>.vercel.app"]` |
   | `EXCHANGE_WINDOW_DAYS` | `3` |

5. Deploy. Verify `https://<service>.onrender.com/health` → `{"status":"ok"}`
   and `/docs`.
6. Seed demo data once (Render Shell, or locally against the same `DATABASE_URL`):
   ```
   python -m scripts.seed
   ```

---

## 3. Frontend → Vercel

1. Vercel → **Import Project** → same repo.
2. **Root Directory:** `frontend` (Framework preset: Next.js).
3. Environment variables:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE_URL` | the Render backend URL |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

4. Deploy → `https://<app>.vercel.app`.

---

## 4. Close the loop

Return to Render and make sure `CORS_ORIGINS` contains the exact Vercel origin,
then redeploy the backend. Open the Vercel URL — the project is live.

---

## 5. CI / CD

GitHub Actions (`.github/workflows/`):

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | push + PR to `main` | **Backend**: ruff lint/format + `pytest --cov` (Python 3.12). **Frontend**: lint → typecheck → build → Playwright smoke. |
| `e2e.yml` | manual + nightly | Full order journey (email OTP → checkout → slip) against a deployed backend; runs only when the `E2E_*` secrets are set. |

**Continuous deployment** stays on the provider Git integrations — Vercel
(frontend) and Render/Railway (backend) deploy on push to `main`. Gate it by
enabling **branch protection** on `main` and requiring the `Backend` and
`Frontend` checks before merge.

Optional `e2e.yml` repository secrets:

| Secret | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | deployed backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | target Supabase project |
| `E2E_EMAIL`, `E2E_OTP`, `E2E_PHONE`, `E2E_VARIANT_ID`, `E2E_TOWNSHIP_ID` | journey inputs |

---

## Local runs (quick reference)

Backend (SQLite preview, no Docker):

```powershell
cd backend
# .venv already exists; add anything missing:
.\.venv\Scripts\python.exe -m pip install uvicorn
# point at Supabase instead of SQLite by editing backend\.env DATABASE_URL
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m scripts.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm run dev        # http://localhost:3000
```

Docker (whole stack):

```bash
cp .env.example .env   # fill in keys
docker compose up --build
```

---

## Caveats

- **Python 3.14 locally** cannot build the pinned `psycopg 3.2.3` / `pydantic 2.9.2`.
  The hosted Docker build uses Python 3.12, where the pins install fine.
- **`/admin` browser pages** are gated by `middleware.ts`, which reads the
  Supabase session cookie written by `@supabase/ssr`. A signed-in user reaches
  the pages; admin *authorization* is still enforced by the backend via
  `profiles.is_admin` / bearer token.
- **Email OTP** works out of the box via Supabase's built-in mailer for dev;
  configure SMTP for production deliverability. Phone OTP (with an SMS vendor)
  is a future option.
