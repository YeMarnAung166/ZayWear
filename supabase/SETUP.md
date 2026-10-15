# Supabase setup for ZayWear

ZayWear authenticates buyers with **phone OTP** and stores payment slips in a
private Storage bucket. Both are configured in the Supabase project dashboard.

## 1. Phone auth provider

1. **Authentication → Providers → Phone** → enable **Enable Phone provider**.
2. Choose an SMS provider and paste its credentials:
   - **Twilio** — Account SID, Auth Token, Message Service SID / from number.
   - **MessageBird**, **Vonage**, or a custom **Send SMS Hook** are also
     supported.
3. Under **Auth → Settings**, set the **SMS OTP expiry** (default 60s is short;
   300s is a comfortable choice for Myanmar networks).
4. Optional hardening:
   - Add Myanmar (`+95`) to **Allowed phone regions**.
   - Configure **Phone rate limits** to reduce SMS abuse.
5. Users sign in with E.164 numbers. The frontend normalizes local Myanmar
   numbers (`09XXXXXXXXX`) to `+959XXXXXXXX` before calling
   `supabase.auth.signInWithOtp({ phone })`.

> Test numbers: for local development you can add a **test OTP**
> (Authentication → Providers → Phone → Test OTP) to avoid real SMS costs.

## 2. Storage bucket for slips

Run [`storage.sql`](./storage.sql) in the **SQL editor**. It creates the private
`slips` bucket and the RLS policies for owner uploads/reads.

## 3. Keys

Copy the project values into your environment (`.env`):

| Key | Where | Used by |
|---|---|---|
| `SUPABASE_URL` | Project Settings → API | backend + frontend |
| `SUPABASE_ANON_KEY` | Project Settings → API | frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API | backend (slip upload + signed URLs) |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT | backend token verification |
| `SUPABASE_STORAGE_BUCKET` | — | defaults to `slips` |
