-- Backfill profiles for auth users created before the on_auth_user_created
-- trigger existed (the remote schema was applied after first sign-in).
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
