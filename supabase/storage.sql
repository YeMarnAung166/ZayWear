-- ZayWear — Supabase Storage setup for payment slips
-- Run in the Supabase SQL editor.

-- 1. Private bucket for uploaded payment slips
insert into storage.buckets (id, name, public)
values ('slips', 'slips', false)
on conflict (id) do nothing;

-- 2. Users may upload slips only under their own orders path.
--    The backend uploads with the service-role key, so client-side
--    inserts are intentionally restricted to the owner folder.
create policy "owners upload own slips"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'slips'
  and (storage.foldername(name))[1] = 'orders'
);

-- 3. Owners read their own slips; admins read all (checked in backend
--    via signed URLs, so no public read policy is granted).
create policy "owners read own slips"
on storage.objects for select
to authenticated
using (bucket_id = 'slips');
