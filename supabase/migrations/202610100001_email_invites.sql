alter table public.partnership_invites
  drop constraint if exists partnership_invites_status_check;
alter table public.partnership_invites
  add constraint partnership_invites_status_check
  check (status in ('pending', 'accepted', 'revoked', 'declined', 'expired'));

create policy "invitees read email invitations"
on public.partnership_invites
for select
using (
  invited_email is not null
  and lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create or replace function public.get_my_pending_invites()
returns table(
  invite_id uuid,
  partnership_id uuid,
  partnership_name text,
  inviter_name text,
  invited_email text,
  expires_at timestamptz,
  created_at timestamptz
)
security definer
set search_path = public, extensions
language sql
stable
as $$
  select
    invitation.id,
    invitation.partnership_id,
    partnership.name,
    inviter.display_name,
    invitation.invited_email,
    invitation.expires_at,
    invitation.created_at
  from public.partnership_invites invitation
  join public.partnerships partnership on partnership.id = invitation.partnership_id
  join public.profiles inviter on inviter.id = invitation.invited_by
  where invitation.status = 'pending'
    and invitation.expires_at > now()
    and invitation.invited_email is not null
    and lower(invitation.invited_email) =
      lower(coalesce(auth.jwt() ->> 'email', ''))
  order by invitation.created_at desc;
$$;

create or replace function public.accept_partner_invite_record(target_invite_id uuid)
returns uuid
security definer
set search_path = public, extensions
language plpgsql
as $$
declare
  invite_row public.partnership_invites;
  existing_partnership uuid;
  existing_member_count integer;
  target_tag_id uuid;
  old_tag record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into invite_row
  from public.partnership_invites
  where id = target_invite_id
  for update;

  if invite_row.id is null
    or invite_row.status <> 'pending'
    or invite_row.expires_at <= now()
  then
    raise exception 'Invitation is invalid or expired';
  end if;

  if invite_row.invited_email is not null
    and lower(invite_row.invited_email) <>
      lower(coalesce(auth.jwt() ->> 'email', ''))
  then
    raise exception 'This invitation was sent to a different email address';
  end if;

  if exists (
    select 1 from public.partnership_members
    where partnership_id = invite_row.partnership_id
      and user_id = auth.uid()
  ) then
    update public.partnership_invites
    set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
    where id = invite_row.id;
    return invite_row.partnership_id;
  end if;

  if (
    select count(*) from public.partnership_members
    where partnership_id = invite_row.partnership_id
  ) >= 2 then
    raise exception 'This partnership is already full';
  end if;

  select partnership_id into existing_partnership
  from public.partnership_members
  where user_id = auth.uid();

  if existing_partnership is not null then
    select count(*) into existing_member_count
    from public.partnership_members
    where partnership_id = existing_partnership;

    if existing_member_count > 1 then
      raise exception 'Leave your current partnership before accepting another invitation';
    end if;

    for old_tag in
      select id, name
      from public.tags
      where partnership_id = existing_partnership
    loop
      select id into target_tag_id
      from public.tags
      where partnership_id = invite_row.partnership_id
        and lower(name) = lower(old_tag.name)
      limit 1;

      if target_tag_id is not null then
        insert into public.schedule_item_tags (item_id, tag_id)
        select item_id, target_tag_id
        from public.schedule_item_tags
        where tag_id = old_tag.id
        on conflict do nothing;
        delete from public.tags where id = old_tag.id;
      end if;
      target_tag_id := null;
    end loop;

    update public.tags
    set partnership_id = invite_row.partnership_id
    where partnership_id = existing_partnership;

    update public.schedule_items
    set partnership_id = invite_row.partnership_id
    where partnership_id = existing_partnership;

    delete from public.partnership_members
    where partnership_id = existing_partnership
      and user_id = auth.uid();
    delete from public.partnerships where id = existing_partnership;
  end if;

  insert into public.partnership_members (
    partnership_id,
    user_id,
    role,
    color
  )
  values (
    invite_row.partnership_id,
    auth.uid(),
    'partner',
    '#c45c3e'
  );

  update public.partnership_invites
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = invite_row.id;

  return invite_row.partnership_id;
end;
$$;

create or replace function public.accept_partner_invite(invite_token text)
returns uuid
security definer
set search_path = public, extensions
language plpgsql
as $$
declare
  target_invite_id uuid;
begin
  select id into target_invite_id
  from public.partnership_invites
  where token_hash = encode(digest(invite_token, 'sha256'), 'hex');

  if target_invite_id is null then
    raise exception 'Invitation is invalid or expired';
  end if;
  return public.accept_partner_invite_record(target_invite_id);
end;
$$;

create or replace function public.accept_partner_invite_by_id(invite_id uuid)
returns uuid
security definer
set search_path = public, extensions
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.partnership_invites invitation
    where invitation.id = invite_id
      and invitation.invited_email is not null
      and lower(invitation.invited_email) =
        lower(coalesce(auth.jwt() ->> 'email', ''))
  ) then
    raise exception 'This invitation was sent to a different email address';
  end if;
  return public.accept_partner_invite_record(invite_id);
end;
$$;

create or replace function public.decline_partner_invite(invite_id uuid)
returns void
security definer
set search_path = public, extensions
language plpgsql
as $$
begin
  update public.partnership_invites invitation
  set status = 'declined'
  where invitation.id = invite_id
    and invitation.status = 'pending'
    and invitation.invited_email is not null
    and lower(invitation.invited_email) =
      lower(coalesce(auth.jwt() ->> 'email', ''));

  if not found then
    raise exception 'Invitation is unavailable';
  end if;
end;
$$;

revoke all on function public.get_my_pending_invites() from public, anon;
revoke all on function public.accept_partner_invite_record(uuid) from public, anon;
revoke all on function public.accept_partner_invite_by_id(uuid) from public, anon;
revoke all on function public.decline_partner_invite(uuid) from public, anon;

grant execute on function public.get_my_pending_invites() to authenticated;
grant execute on function public.accept_partner_invite_by_id(uuid) to authenticated;
grant execute on function public.decline_partner_invite(uuid) to authenticated;
