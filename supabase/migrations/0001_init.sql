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
-- settings: per-parent preferences (e.g. state-mandated instructional days)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  parent_id      uuid primary key references public.profiles (id) on delete cascade,
  required_days  int not null default 180,
  school_year    text,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- kids
-- ---------------------------------------------------------------------------
create table if not exists public.kids (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  grade       text,
  birthdate   date,            -- age is derived from this (no annual drift)
  created_at  timestamptz not null default now()
);
create index if not exists kids_parent_idx on public.kids (parent_id);

-- ---------------------------------------------------------------------------
-- attendance  (one row per kid per day)
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  kid_id      uuid not null references public.kids (id) on delete cascade,
  date        date not null,
  status      text not null default 'present'
                check (status in ('present','absent','half','field_trip','holiday')),
  counts_as_school_day boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (kid_id, date)
);
create index if not exists attendance_kid_date_idx on public.attendance (kid_id, date);

-- ---------------------------------------------------------------------------
-- loops + loop_items + completions
-- A kid can run several parallel loops (e.g. "Morning Basket", "Electives").
-- current_position is the resume pointer — "pick up where we left off".
-- ---------------------------------------------------------------------------
create table if not exists public.loops (
  id                uuid primary key default gen_random_uuid(),
  kid_id            uuid not null references public.kids (id) on delete cascade,
  name              text not null default 'Loop',
  current_position  int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists loops_kid_idx on public.loops (kid_id);

create table if not exists public.loop_items (
  id          uuid primary key default gen_random_uuid(),
  loop_id     uuid not null references public.loops (id) on delete cascade,
  subject     text not null,
  position    int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists loop_items_loop_idx on public.loop_items (loop_id, position);

create table if not exists public.loop_completions (
  id            uuid primary key default gen_random_uuid(),
  loop_item_id  uuid not null references public.loop_items (id) on delete cascade,
  date          date not null default current_date,
  created_at    timestamptz not null default now()
);
create index if not exists loop_completions_item_idx on public.loop_completions (loop_item_id, date);

-- ---------------------------------------------------------------------------
-- courses + hours_log: high-school credit accounting
-- A course rolls instructional hours toward a credit target (Carnegie unit,
-- commonly ~120-180 hrs = 1 credit). hours_log can attach to a course or stand
-- alone with a free-text subject.
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id                  uuid primary key default gen_random_uuid(),
  kid_id              uuid not null references public.kids (id) on delete cascade,
  name                text not null,
  credit_target_hours numeric(6,2) not null default 120,
  credit_value        numeric(4,2) not null default 1,
  school_year         text,
  created_at          timestamptz not null default now()
);
create index if not exists courses_kid_idx on public.courses (kid_id);

create table if not exists public.hours_log (
  id          uuid primary key default gen_random_uuid(),
  kid_id      uuid not null references public.kids (id) on delete cascade,
  course_id   uuid references public.courses (id) on delete set null,
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
-- Ownership helpers (security definer so they can see across RLS to verify)
-- ===========================================================================
create or replace function public.owns_kid(k uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.kids where id = k and parent_id = auth.uid());
$$;

create or replace function public.owns_loop(l uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.loops lo
    join public.kids ki on ki.id = lo.kid_id
    where lo.id = l and ki.parent_id = auth.uid()
  );
$$;

create or replace function public.owns_loop_item(i uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.loop_items it
    join public.loops lo on lo.id = it.loop_id
    join public.kids ki on ki.id = lo.kid_id
    where it.id = i and ki.parent_id = auth.uid()
  );
$$;

create or replace function public.owns_course(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.courses co
    join public.kids ki on ki.id = co.kid_id
    where co.id = c and ki.parent_id = auth.uid()
  );
$$;

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table public.profiles        enable row level security;
alter table public.settings        enable row level security;
alter table public.kids            enable row level security;
alter table public.attendance      enable row level security;
alter table public.loops           enable row level security;
alter table public.loop_items      enable row level security;
alter table public.loop_completions enable row level security;
alter table public.courses         enable row level security;
alter table public.hours_log       enable row level security;
alter table public.books           enable row level security;
alter table public.events          enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own settings" on public.settings
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

create policy "own kids" on public.kids
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

create policy "own attendance" on public.attendance
  for all using (public.owns_kid(kid_id)) with check (public.owns_kid(kid_id));

create policy "own loops" on public.loops
  for all using (public.owns_kid(kid_id)) with check (public.owns_kid(kid_id));

create policy "own loop_items" on public.loop_items
  for all using (public.owns_loop(loop_id)) with check (public.owns_loop(loop_id));

create policy "own loop_completions" on public.loop_completions
  for all using (public.owns_loop_item(loop_item_id))
  with check (public.owns_loop_item(loop_item_id));

create policy "own courses" on public.courses
  for all using (public.owns_kid(kid_id)) with check (public.owns_kid(kid_id));

-- hours_log: must own the kid, and the course (when set) must belong to them too
create policy "own hours_log" on public.hours_log
  for all using (public.owns_kid(kid_id))
  with check (
    public.owns_kid(kid_id)
    and (course_id is null or public.owns_course(course_id))
  );

create policy "own books" on public.books
  for all using (public.owns_kid(kid_id)) with check (public.owns_kid(kid_id));

-- events: own the parent row, and the kid (when set) must belong to them too
create policy "own events" on public.events
  for all using (parent_id = auth.uid())
  with check (
    parent_id = auth.uid()
    and (kid_id is null or public.owns_kid(kid_id))
  );
