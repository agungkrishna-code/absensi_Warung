-- Username lookup for login. The RPC returns an email only for a matching
-- username; keep usernames unique regardless of case or surrounding spaces.
alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(btrim(username)))
  where username is not null;

create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select email
  from public.profiles
  where lower(btrim(username)) = lower(btrim(p_username))
    and email is not null
  limit 1;
$$;

revoke all on function public.email_for_username(text) from public, anon;
grant execute on function public.email_for_username(text) to anon, authenticated;

-- Admins manage usernames from the employee screen; email and role remain locked.
grant update (username) on public.profiles to authenticated;
create policy "profiles_update_username_admin"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
