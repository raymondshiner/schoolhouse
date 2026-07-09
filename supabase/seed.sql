-- Dev seed: populate a sample homeschool family.
-- Safe to run in the Supabase SQL editor AFTER you have signed in at least once
-- (so an auth user exists). It attaches the sample data to the most recently
-- created auth user and no-ops if that user already has kids.

do $$
declare
  pid uuid;
  ada uuid;
  leo uuid;
  morning uuid;
  electives uuid;
  bio uuid;
begin
  select id into pid from auth.users order by created_at desc limit 1;
  if pid is null then
    raise notice 'No auth user found — sign in once, then re-run this seed.';
    return;
  end if;

  insert into public.profiles (id) values (pid) on conflict (id) do nothing;
  insert into public.settings (parent_id, required_days, school_year)
    values (pid, 180, '2025-2026') on conflict (parent_id) do nothing;

  if exists (select 1 from public.kids where parent_id = pid) then
    raise notice 'Sample family already present — skipping.';
    return;
  end if;

  insert into public.kids (parent_id, name, grade, birthdate)
    values (pid, 'Ada', '3rd', '2016-09-04') returning id into ada;
  insert into public.kids (parent_id, name, grade, birthdate)
    values (pid, 'Leo', '10th', '2010-02-17') returning id into leo;

  -- Attendance: last 5 days for both kids
  insert into public.attendance (kid_id, date, status)
  select k.id, d::date, 'present'
  from (values (ada), (leo)) as k(id),
       generate_series(current_date - 4, current_date, interval '1 day') as d;

  -- A family loop (both kids) and a solo loop for Ada
  insert into public.loops (parent_id, name, current_position)
    values (pid, 'Morning Basket', 1) returning id into morning;
  insert into public.loop_kids (loop_id, kid_id) values (morning, ada), (morning, leo);
  insert into public.loop_items (loop_id, subject, position) values
    (morning, 'Poetry', 0),
    (morning, 'Nature Study', 1),
    (morning, 'Art', 2),
    (morning, 'Geography', 3);

  insert into public.loops (parent_id, name, current_position)
    values (pid, 'Ada Electives', 0) returning id into electives;
  insert into public.loop_kids (loop_id, kid_id) values (electives, ada);
  insert into public.loop_items (loop_id, subject, position) values
    (electives, 'Piano', 0),
    (electives, 'Coding', 1);

  -- A high-school course + hours for Leo
  insert into public.courses (kid_id, name, credit_target_hours, credit_value, school_year)
    values (leo, 'Biology', 120, 1, '2025-2026') returning id into bio;
  insert into public.hours_log (kid_id, course_id, subject, date, hours, description) values
    (leo, bio, 'Biology', current_date - 3, 1.5, 'Cell structure reading + notes'),
    (leo, bio, 'Biology', current_date - 1, 2.0, 'Microscope lab');

  -- Books
  insert into public.books (kid_id, title, author, started_on, finished_on, status) values
    (ada, 'Charlotte''s Web', 'E. B. White', current_date - 20, current_date - 6, 'finished'),
    (ada, 'The Wind in the Willows', 'Kenneth Grahame', current_date - 5, null, 'reading'),
    (leo, 'The Hobbit', 'J. R. R. Tolkien', current_date - 10, null, 'reading');

  -- Events for the calendar
  insert into public.events (parent_id, kid_id, date, title, type) values
    (pid, null, current_date + 2, 'Co-op day', 'event'),
    (pid, ada, current_date + 5, 'Science museum', 'field_trip');

  raise notice 'Seeded sample family for user %', pid;
end $$;
