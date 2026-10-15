# Supabase setup for ZayWear

ZayWear authenticates buyers with **email OTP** and stores payment slips in a
private Storage bucket. Both are configured in the Supabase project dashboard.

## 1. Email auth provider

1. **Authentication → Providers → Email** → enable **Enable email provider**.
2. Choose how verification emails are sent:
   - **Built-in email service** — zero setup, but heavily rate limited and
     for development only.
   - **Custom SMTP** (e.g. Resend, Postmark, Sendgrid) — required for
     production; paste the SMTP host/port/user/password.
3. **Use a 6-digit code instead of a magic link** — Authentication → **Email
   Templates** → **Magic Link** → include `{{ .Token }}` in the body. The
   frontend calls `supabase.auth.verifyOtp({ email, token, type: "email" })`,
   which needs the numeric token, not just the link.
4. Under **Auth → Settings**, set the **Email OTP expiry** (default 60m is fine)
   and confirm email confirmation is enabled so new users are created on first
   sign-in.
5. Users sign in with an email address. The frontend calls
   `supabase.auth.signInWithOtp({ email })` and then
   `supabase.auth.verifyOtp({ email, token, type: "email" })`. Sessions are
   stored in cookies (`@supabase/ssr`), so `middleware.ts` can gate `/admin`.

> Phone OTP is not used for now. To switch later, re-enable the **Phone**
> provider, add an SMS vendor (Twilio/MessageBird/Vonage) or a **Test OTP**
> entry, and restore the phone flow in `frontend/app/(public)/login/page.tsx`.


## 2. Storage bucket for slips

Run [`storage.sql`](./storage.sql) in the **SQL editor**. It creates the private
`slips` bucket and the RLS policies for owner uploads/reads.

## 3. Keys

Copy the project values into your environment (`.env`):

| Key | Where | Used by |
|---|---|---|
| `SUPABASE_URL` | Project Settings → API | backend (also `NEXT_PUBLIC_SUPABASE_URL` on the frontend) |
| `SUPABASE_ANON_KEY` | Project Settings → API | frontend (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API | backend (slip upload + signed URLs) |
| `SUPABASE_STORAGE_BUCKET` | — | defaults to `slips` |

> `SUPABASE_JWT_SECRET` is **not** used — the backend verifies tokens via JWKS
> (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`). Omit it.
