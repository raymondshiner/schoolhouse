-- Schoolhouse initial schema
-- Every table is scoped to the signed-in parent via Row-Level Security.
-- A parent can only ever read/write their own rows; the anon key is safe to
-- ship in the client because the database itself enforces isolation.

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated parent (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- kids
-- ---------------------------------------------------------------------------
create table if not exists public.kids (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  grade       text,
  age         int,
  created_at  timestamptz not null default now()
);
create index if not exists kids_parent_idx on public.kids (parent_id);

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  kid_id      uuid not null references public.kids (id) on delete cascade,
  date        date not null,
  status      text not null default 'present'
                check (status in ('present','absent','half','field_trip')),
  notes       text,
  created_at  timestamptz not null default now(),
  unique (kid_id, date)
);
create index if not exists attendance_kid_date_idx on public.attendance (kid_id, date);

-- ---------------------------------------------------------------------------
-- loop_items: ordered subjects/work for loop scheduling
-- ---------------------------------------------------------------------------
create table if not exists public.loop_items (
  id          uuid primary key default gen_random_uuid(),
  kid_id      uuid not null references public.kids (id) on delete cascade,
  subject     text not null,
  position    int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists loop_items_kid_idx on public.loop_items (kid_id, position);

-- loop_state: pointer to where each kid left off in their loop
create table if not exists public.loop_state (
  kid_id            uuid primary key references public.kids (id) on delete cascade,
  current_position  int not null default 0,
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- hours_log: for high-school credit accounting
-- ---------------------------------------------------------------------------
create table if not exists public.hours_log (
  id          uuid primary key default gen_random_uuid(),
  kid_id      uuid not null references public.kids (id) on delete cascade,
  subject     text,
  date        date not null,
  hours       numeric(5,2) not null check (hours >= 0),
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists hours_log_kid_date_idx on public.hours_log (kid_id, date);

-- ---------------------------------------------------------------------------
-- books: reading log
-- ---------------------------------------------------------------------------
create table if not exists public.books (
  id           uuid primary key default gen_random_uuid(),
  kid_id       uuid not null references public.kids (id) on delete cascade,
  title        text not null,
  author       text,
  started_on   date,
  finished_on  date,
  status       text not null default 'reading'
                 check (status in ('to_read','reading','finished')),
  created_at   timestamptz not null default now()
);
create index if not exists books_kid_idx on public.books (kid_id);

-- ---------------------------------------------------------------------------
-- events: powers monthly + yearly calendars (schoolwork, events, field trips)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles (id) on delete cascade,
  kid_id      uuid references public.kids (id) on delete cascade,
  date        date not null,
  title       text not null,
  type        text not null default 'schoolwork'
                check (type in ('schoolwork','event','field_trip')),
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists events_parent_date_idx on public.events (parent_id, date);

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table public.profiles   enable row level security;
alter table public.kids       enable row level security;
alter table public.attendance enable row level security;
alter table public.loop_items enable row level security;
alter table public.loop_state enable row level security;
alter table public.hours_log  enable row level security;
alter table public.books      enable row level security;
alter table public.events     enable row level security;

-- profiles: a parent sees only their own profile
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- kids: scoped directly by parent_id
create policy "own kids" on public.kids
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- Helper: is this kid owned by the current user?
create or replace function public.owns_kid(k uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.kids
    where id = k and parent_id = auth.uid()
  );
$$;

-- child tables: scoped through kid ownership
create policy "own attendance" on public.attendance
  for all using (public.owns_kid(kid_id)) with check (public.owns_kid(kid_id));
create policy "own loop_items" on public.loop_items
  for all using (public.owns_kid(kid_id)) with check (public.owns_kid(kid_id));
create policy "own loop_state" on public.loop_state
  for all using (public.owns_kid(kid_id)) with check (public.owns_kid(kid_id));
create policy "own hours_log" on public.hours_log
  for all using (public.owns_kid(kid_id)) with check (public.owns_kid(kid_id));
create policy "own books" on public.books
  for all using (public.owns_kid(kid_id)) with check (public.owns_kid(kid_id));

-- events: scoped by parent_id (kid_id optional)
create policy "own events" on public.events
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
