-- Google Calendar two-way sync.
-- refresh_token is WRITE-ONLY for the client: column-level grants let the
-- browser store/replace it at connect time but never select it back. Only the
-- google-token edge function (service role) can read it.
create table if not exists public.google_sync (
  parent_id           uuid primary key references public.profiles (id) on delete cascade,
  refresh_token       text not null,
  family_calendar_id  text,
  connected_at        timestamptz not null default now()
);

alter table public.google_sync enable row level security;

create policy "own sync row" on public.google_sync
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

revoke all on table public.google_sync from anon, authenticated;
grant select (parent_id, family_calendar_id, connected_at)
  on public.google_sync to authenticated;
grant insert (parent_id, refresh_token, family_calendar_id)
  on public.google_sync to authenticated;
grant update (parent_id, refresh_token, family_calendar_id)
  on public.google_sync to authenticated;
grant delete on table public.google_sync to authenticated;

-- Per-kid Google calendar + per-event mapping for push sync.
alter table public.kids
  add column if not exists google_calendar_id text;
alter table public.events
  add column if not exists google_event_id text,
  add column if not exists google_calendar_id text;
