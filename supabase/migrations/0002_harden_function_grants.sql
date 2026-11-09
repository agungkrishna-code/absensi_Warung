-- Supabase grants EXECUTE on new public functions to `anon` by default.
-- App RPCs must only be callable by signed-in users.
revoke all on function public.is_admin() from anon;
revoke all on function public.record_check_in() from anon;
revoke all on function public.record_check_out() from anon;
