-- ---------------------------------------------------------------------------
-- Decouple loops from kids.
-- A loop now belongs to the parent and can have ANY set of kids assigned via
-- the loop_kids join table — a "Family" loop with everyone, a loop for a few
-- kids, or a solo loop, all at once. Kid deletion detaches the kid but the
-- loop survives.
-- ---------------------------------------------------------------------------

-- 1. Parent ownership on loops
alter table public.loops
  add column if not exists parent_id uuid references public.profiles (id) on delete cascade;

update public.loops l
set parent_id = k.parent_id
from public.kids k
where l.kid_id = k.id and l.parent_id is null;

alter table public.loops alter column parent_id set not null;
create index if not exists loops_parent_idx on public.loops (parent_id);

-- 2. loop_kids join table (0..N kids per loop)
create table if not exists public.loop_kids (
  loop_id     uuid not null references public.loops (id) on delete cascade,
  kid_id      uuid not null references public.kids (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (loop_id, kid_id)
);
create index if not exists loop_kids_kid_idx on public.loop_kids (kid_id);

-- 3. Backfill existing assignments
insert into public.loop_kids (loop_id, kid_id)
  select id, kid_id from public.loops where kid_id is not null
  on conflict do nothing;

-- 4. Ownership helpers now flow through parent_id, not the kid
--    (must precede the column drop — the old policy/functions reference kid_id)
create or replace function public.owns_loop(l uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.loops lo
    where lo.id = l and lo.parent_id = auth.uid()
  );
$$;

create or replace function public.owns_loop_item(i uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.loop_items it
    join public.loops lo on lo.id = it.loop_id
    where it.id = i and lo.parent_id = auth.uid()
  );
$$;

-- 5. RLS: loops by parent; loop_kids requires owning both the loop and the kid
drop policy if exists "own loops" on public.loops;
create policy "own loops" on public.loops
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

alter table public.loop_kids enable row level security;
create policy "own loop_kids" on public.loop_kids
  for all using (public.owns_loop(loop_id))
  with check (public.owns_loop(loop_id) and public.owns_kid(kid_id));

-- 6. Drop the old per-kid column last (policy dependency is gone now)
drop index if exists public.loops_kid_idx;
alter table public.loops drop column if exists kid_id;
