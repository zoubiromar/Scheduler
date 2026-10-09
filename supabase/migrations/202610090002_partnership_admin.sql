create or replace function public.remove_partnership_member(member_id uuid)
returns void
security definer
set search_path = public
language plpgsql as $$
declare
  target_partnership uuid;
begin
  select partnership_id into target_partnership
  from public.partnership_members
  where user_id = auth.uid() and role = 'admin';
  if target_partnership is null then raise exception 'Admin partnership required'; end if;
  if member_id = auth.uid() then raise exception 'Transfer admin or dissolve the partnership'; end if;

  delete from public.partnership_members
  where partnership_id = target_partnership and user_id = member_id;
end;
$$;

create or replace function public.leave_partnership()
returns void
security definer
set search_path = public
language plpgsql as $$
begin
  if exists (
    select 1 from public.partnership_members
    where user_id = auth.uid() and role = 'admin'
  ) then raise exception 'Transfer admin or dissolve the partnership'; end if;

  delete from public.partnership_members where user_id = auth.uid();
end;
$$;

create or replace function public.dissolve_partnership()
returns void
security definer
set search_path = public
language plpgsql as $$
declare
  target_partnership uuid;
begin
  select partnership_id into target_partnership
  from public.partnership_members
  where user_id = auth.uid() and role = 'admin';
  if target_partnership is null then raise exception 'Admin partnership required'; end if;
  delete from public.partnerships where id = target_partnership;
end;
$$;

revoke all on function public.remove_partnership_member(uuid) from public, anon;
revoke all on function public.leave_partnership() from public, anon;
revoke all on function public.dissolve_partnership() from public, anon;

grant execute on function public.remove_partnership_member(uuid) to authenticated;
grant execute on function public.leave_partnership() to authenticated;
grant execute on function public.dissolve_partnership() to authenticated;
