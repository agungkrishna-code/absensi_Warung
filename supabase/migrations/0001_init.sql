-- warung-attendance: initial schema, security and attendance RPCs
-- Run in Supabase SQL Editor or with `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  role text not null default 'employee' check (role in ('admin', 'employee')),
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  employee_code text not null unique,
  full_name text not null,
  phone text,
  position text,
  employment_status text not null default 'active'
    check (employment_status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  shift_start time not null,
  shift_end time not null,
  created_at timestamptz not null default now(),
  unique (employee_id, work_date),
  check (shift_end > shift_start)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete restrict,
  work_date date not null,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  status text not null default 'present' check (status in ('present', 'late')),
  created_at timestamptz not null default now(),
  unique (employee_id, work_date),
  check (check_out is null or check_out > check_in)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index attendance_employee_idx on public.attendance (employee_id);
create index attendance_work_date_idx on public.attendance (work_date);
create index attendance_created_at_idx on public.attendance (created_at);
create index work_schedules_work_date_idx on public.work_schedules (work_date);
create index audit_logs_created_at_idx on public.audit_logs (created_at);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

-- ---------------------------------------------------------------------------
-- Profile provisioning and role protection
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this migration.
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

create or replace function public.prevent_role_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Allow service_role (API) and privileged database roles (SQL Editor,
  -- migrations). End users always execute as `authenticated`.
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Role changes are not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.work_schedules enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: own profile or admin; users may edit their own name only
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- employees: own record or admin; only admins write
create policy "employees_select_own_or_admin"
  on public.employees for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy "employees_insert_admin"
  on public.employees for insert to authenticated
  with check (public.is_admin());

create policy "employees_update_admin"
  on public.employees for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "employees_delete_admin"
  on public.employees for delete to authenticated
  using (public.is_admin());

-- work_schedules: own or admin; only admins write
create policy "schedules_select_own_or_admin"
  on public.work_schedules for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.employees e
      where e.id = work_schedules.employee_id and e.profile_id = auth.uid()
    )
  );

create policy "schedules_insert_admin"
  on public.work_schedules for insert to authenticated
  with check (public.is_admin());

create policy "schedules_update_admin"
  on public.work_schedules for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "schedules_delete_admin"
  on public.work_schedules for delete to authenticated
  using (public.is_admin());

-- attendance: readable by owner or admin; writes only through RPCs
create policy "attendance_select_own_or_admin"
  on public.attendance for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.employees e
      where e.id = attendance.employee_id and e.profile_id = auth.uid()
    )
  );

-- audit_logs: admins read only; written by privileged functions
create policy "audit_logs_select_admin"
  on public.audit_logs for select to authenticated
  using (public.is_admin());

-- Explicit table privileges (RLS still restricts rows; attendance writes are RPC-only).
revoke all on public.profiles, public.employees, public.work_schedules,
  public.attendance, public.audit_logs from anon;

grant select on public.profiles, public.employees, public.work_schedules,
  public.attendance, public.audit_logs to authenticated;
grant insert, update, delete on public.employees to authenticated;
grant insert, update, delete on public.work_schedules to authenticated;
-- Only the display name is editable from the app; role/email stay locked.
grant update (full_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Attendance RPCs (timestamps and work dates come from PostgreSQL)
-- ---------------------------------------------------------------------------

create or replace function public.record_check_in()
returns public.attendance
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_employee public.employees;
  v_work_date date := (now() at time zone 'Asia/Makassar')::date;
  v_shift_start time;
  v_status text := 'present';
  v_attendance public.attendance;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_employee
  from public.employees
  where profile_id = v_uid;

  if v_employee.id is null then
    raise exception 'Employee record not found';
  end if;

  if v_employee.employment_status <> 'active' then
    raise exception 'Employee is not active';
  end if;

  select shift_start into v_shift_start
  from public.work_schedules
  where employee_id = v_employee.id and work_date = v_work_date;

  if v_shift_start is not null
     and (now() at time zone 'Asia/Makassar')::time > v_shift_start then
    v_status := 'late';
  end if;

  insert into public.attendance (employee_id, work_date, check_in, status)
  values (v_employee.id, v_work_date, now(), v_status)
  on conflict (employee_id, work_date) do nothing
  returning * into v_attendance;

  if v_attendance.id is null then
    raise exception 'Already checked in for today';
  end if;

  insert into public.audit_logs (actor_id, action, details)
  values (
    v_uid,
    'check_in',
    jsonb_build_object(
      'attendance_id', v_attendance.id,
      'employee_id', v_employee.id,
      'work_date', v_work_date,
      'status', v_status
    )
  );

  return v_attendance;
end;
$$;

create or replace function public.record_check_out()
returns public.attendance
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_employee public.employees;
  v_work_date date := (now() at time zone 'Asia/Makassar')::date;
  v_attendance public.attendance;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_employee
  from public.employees
  where profile_id = v_uid;

  if v_employee.id is null then
    raise exception 'Employee record not found';
  end if;

  if v_employee.employment_status <> 'active' then
    raise exception 'Employee is not active';
  end if;

  update public.attendance
  set check_out = now()
  where employee_id = v_employee.id
    and work_date = v_work_date
    and check_out is null
  returning * into v_attendance;

  if v_attendance.id is null then
    if exists (
      select 1 from public.attendance
      where employee_id = v_employee.id and work_date = v_work_date
    ) then
      raise exception 'Already checked out for today';
    end if;
    raise exception 'No check-in found for today';
  end if;

  insert into public.audit_logs (actor_id, action, details)
  values (
    v_uid,
    'check_out',
    jsonb_build_object(
      'attendance_id', v_attendance.id,
      'employee_id', v_employee.id,
      'work_date', v_work_date
    )
  );

  return v_attendance;
end;
$$;

revoke all on function public.record_check_in() from public;
revoke all on function public.record_check_out() from public;
revoke all on function public.record_check_in() from anon;
revoke all on function public.record_check_out() from anon;
grant execute on function public.record_check_in() to authenticated;
grant execute on function public.record_check_out() to authenticated;
