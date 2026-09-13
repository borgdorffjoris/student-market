-- ============================================================
-- Student Market — database schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- ============================================================

-- 1. Profiles: one row per logged-in person (admin or company), linked to Supabase auth
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'company')),
  company_name text,
  email text not null,
  created_at timestamptz not null default now()
);

-- 2. Students: the master list
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- 3. Registrations: which company registered which student, in which session
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  company_id uuid not null references profiles(id) on delete cascade,
  session text not null check (session in ('morning', 'afternoon')),
  created_at timestamptz not null default now(),
  unique (student_id, session) -- one company per student per session (max 2 total: AM + PM)
);

-- 4. Settings: single row holding the morning/afternoon cutoff hour (0-23, 24h clock)
create table if not exists settings (
  id int primary key default 1,
  cutoff_hour int not null default 12,
  constraint settings_single_row check (id = 1)
);
insert into settings (id, cutoff_hour) values (1, 12)
  on conflict (id) do nothing;

-- ============================================================
-- Helper: is the current logged-in user an admin?
-- (security definer so it can read profiles even under RLS)
-- ============================================================
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table students enable row level security;
alter table registrations enable row level security;
alter table settings enable row level security;

-- Profiles: a user can see their own profile; admins can see everyone
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or is_admin());

drop policy if exists "profiles_admin_write" on profiles;
create policy "profiles_admin_write" on profiles
  for insert with check (is_admin());

drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles
  for update using (is_admin());

-- Students: admins can do everything; logged-in companies can read (to look up numbers)
drop policy if exists "students_admin_all" on students;
create policy "students_admin_all" on students
  for all using (is_admin()) with check (is_admin());

drop policy if exists "students_company_read" on students;
create policy "students_company_read" on students
  for select using (auth.uid() is not null);

-- Registrations: admins see everything; companies see and add only their own
drop policy if exists "registrations_admin_all" on registrations;
create policy "registrations_admin_all" on registrations
  for all using (is_admin()) with check (is_admin());

drop policy if exists "registrations_company_select_own" on registrations;
create policy "registrations_company_select_own" on registrations
  for select using (company_id = auth.uid());

drop policy if exists "registrations_company_insert_own" on registrations;
create policy "registrations_company_insert_own" on registrations
  for insert with check (company_id = auth.uid());

-- Settings: any logged-in user can read (needed to compute the current session);
-- only admins can change it.
drop policy if exists "settings_read_authenticated" on settings;
create policy "settings_read_authenticated" on settings
  for select using (auth.uid() is not null);

drop policy if exists "settings_admin_write" on settings;
create policy "settings_admin_write" on settings
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- After running this file, create your own admin account:
-- 1. Go to Authentication > Users > Add user (in Supabase dashboard)
--    Enter your email + a password, and tick "Auto Confirm User".
-- 2. Copy the new user's UUID (shown in the users list).
-- 3. Run this, replacing the placeholders:
--
-- insert into profiles (id, role, email)
-- values ('paste-the-uuid-here', 'admin', 'your@email.com');
-- ============================================================
