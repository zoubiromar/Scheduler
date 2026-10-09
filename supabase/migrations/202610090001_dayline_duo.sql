create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Pellia',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partnership_members (
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'partner')),
  color text not null default '#3f6b58',
  joined_at timestamptz not null default now(),
  primary key (partnership_id, user_id),
  unique (user_id)
);

create table public.partnership_invites (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  invited_by uuid not null references public.profiles(id),
  invited_email text,
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (partnership_id, name)
);

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  kind text not null check (kind in ('task', 'event')),
  scope text not null default 'shared' check (scope in ('personal', 'shared')),
  visibility text not null default 'partner_visible'
    check (visibility in ('private', 'partner_visible')),
  completion_rule text not null default 'assigned'
    check (completion_rule in ('assigned', 'either', 'both')),
  title text not null,
  notes text,
  item_date date,
  start_time time,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 1440),
  recurrence jsonb,
  anchor_timezone text not null default 'UTC',
  source text not null default 'manual' check (source in ('manual', 'booking', 'google')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'task' and recurrence is not null)
    or (kind = 'event' and item_date is not null)
  ),
  check (scope = 'personal' or visibility = 'partner_visible')
);

create table public.schedule_item_assignees (
  item_id uuid not null references public.schedule_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create table public.schedule_item_tags (
  item_id uuid not null references public.schedule_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

create table public.occurrence_overrides (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.schedule_items(id) on delete cascade,
  original_date date not null,
  display_date date not null,
  title text not null,
  notes text,
  start_time time,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 5 and 1440),
  cancelled boolean not null default false,
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (item_id, original_date)
);

create table public.occurrence_completions (
  item_id uuid not null references public.schedule_items(id) on delete cascade,
  occurrence_date date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (item_id, occurrence_date, user_id)
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  default_scope text not null default 'shared' check (default_scope in ('personal', 'shared')),
  default_visibility text not null default 'partner_visible'
    check (default_visibility in ('private', 'partner_visible')),
  default_completion_rule text not null default 'assigned'
    check (default_completion_rule in ('assigned', 'either', 'both')),
  day_start_hour smallint not null default 7 check (day_start_hour between 0 and 12),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger partnerships_set_updated_at before update on public.partnerships
for each row execute function public.set_updated_at();
create trigger schedule_items_set_updated_at before update on public.schedule_items
for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.user_preferences
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql as $$
begin
  insert into public.profiles (id, display_name, avatar_url, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  )
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_partnership_member(target_partnership uuid)
returns boolean
stable
security definer
set search_path = public
language sql as $$
  select exists (
    select 1 from public.partnership_members
    where partnership_id = target_partnership and user_id = auth.uid()
  );
$$;

create or replace function public.is_partnership_admin(target_partnership uuid)
returns boolean
stable
security definer
set search_path = public
language sql as $$
  select exists (
    select 1 from public.partnership_members
    where partnership_id = target_partnership
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.create_partnership(partnership_name text default 'Our Pellia')
returns uuid
security definer
set search_path = public
language plpgsql as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.partnership_members where user_id = auth.uid()) then
    raise exception 'You already belong to a partnership';
  end if;

  insert into public.partnerships (name, created_by)
  values (coalesce(nullif(trim(partnership_name), ''), 'Our Pellia'), auth.uid())
  returning id into new_id;

  insert into public.partnership_members (partnership_id, user_id, role, color)
  values (new_id, auth.uid(), 'admin', '#3f6b58');
  return new_id;
end;
$$;

create or replace function public.create_partner_invite(invited_email text default null)
returns table(invite_id uuid, invite_token text, expires_at timestamptz)
security definer
set search_path = public
language plpgsql as $$
declare
  member_partnership uuid;
  raw_token text;
  created_invite public.partnership_invites;
begin
  select partnership_id into member_partnership
  from public.partnership_members
  where user_id = auth.uid() and role = 'admin';

  if member_partnership is null then raise exception 'Admin partnership required'; end if;
  if (select count(*) from public.partnership_members where partnership_id = member_partnership) >= 2 then
    raise exception 'This partnership already has two members';
  end if;

  update public.partnership_invites
  set status = 'revoked'
  where partnership_id = member_partnership and status = 'pending';

  raw_token := encode(gen_random_bytes(24), 'hex');
  insert into public.partnership_invites (
    partnership_id, invited_by, invited_email, token_hash
  ) values (
    member_partnership, auth.uid(), nullif(lower(trim(invited_email)), ''), encode(digest(raw_token, 'sha256'), 'hex')
  ) returning * into created_invite;

  return query select created_invite.id, raw_token, created_invite.expires_at;
end;
$$;

create or replace function public.get_invite_details(invite_token text)
returns table(
  invite_id uuid,
  partnership_id uuid,
  partnership_name text,
  inviter_name text,
  invited_email text,
  expires_at timestamptz,
  status text
)
security definer
set search_path = public
language sql as $$
  select
    i.id,
    i.partnership_id,
    p.name,
    inviter.display_name,
    i.invited_email,
    i.expires_at,
    case when i.status = 'pending' and i.expires_at <= now() then 'expired' else i.status end
  from public.partnership_invites i
  join public.partnerships p on p.id = i.partnership_id
  join public.profiles inviter on inviter.id = i.invited_by
  where i.token_hash = encode(digest(invite_token, 'sha256'), 'hex');
$$;

create or replace function public.accept_partner_invite(invite_token text)
returns uuid
security definer
set search_path = public
language plpgsql as $$
declare
  invite_row public.partnership_invites;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.partnership_members where user_id = auth.uid()) then
    raise exception 'Leave your current partnership before accepting another invitation';
  end if;

  select * into invite_row
  from public.partnership_invites
  where token_hash = encode(digest(invite_token, 'sha256'), 'hex')
  for update;

  if invite_row.id is null or invite_row.status <> 'pending' or invite_row.expires_at <= now() then
    raise exception 'Invitation is invalid or expired';
  end if;
  if (select count(*) from public.partnership_members where partnership_id = invite_row.partnership_id) >= 2 then
    raise exception 'This partnership is already full';
  end if;

  insert into public.partnership_members (partnership_id, user_id, role, color)
  values (invite_row.partnership_id, auth.uid(), 'partner', '#c45c3e');

  update public.partnership_invites
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = invite_row.id;
  return invite_row.partnership_id;
end;
$$;

create or replace function public.revoke_partner_invite(invite_id uuid)
returns void
security definer
set search_path = public
language plpgsql as $$
begin
  update public.partnership_invites i
  set status = 'revoked'
  where i.id = invite_id
    and public.is_partnership_admin(i.partnership_id)
    and i.status = 'pending';
end;
$$;

create or replace function public.transfer_partnership_admin(next_admin uuid)
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
  if not exists (
    select 1 from public.partnership_members
    where partnership_id = target_partnership and user_id = next_admin
  ) then raise exception 'New admin must be your partner'; end if;

  update public.partnership_members
  set role = case when user_id = next_admin then 'admin' else 'partner' end
  where partnership_id = target_partnership;
end;
$$;

alter table public.profiles enable row level security;
alter table public.partnerships enable row level security;
alter table public.partnership_members enable row level security;
alter table public.partnership_invites enable row level security;
alter table public.tags enable row level security;
alter table public.schedule_items enable row level security;
alter table public.schedule_item_assignees enable row level security;
alter table public.schedule_item_tags enable row level security;
alter table public.occurrence_overrides enable row level security;
alter table public.occurrence_completions enable row level security;
alter table public.user_preferences enable row level security;

create policy "profiles self and partner read" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1
    from public.partnership_members mine
    join public.partnership_members theirs using (partnership_id)
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "partnership members read" on public.partnerships for select using (public.is_partnership_member(id));
create policy "partnership admin update" on public.partnerships for update using (public.is_partnership_admin(id));
create policy "partnership admin delete" on public.partnerships for delete using (public.is_partnership_admin(id));

create policy "members read partnership" on public.partnership_members for select using (
  public.is_partnership_member(partnership_id)
);
create policy "members update own color" on public.partnership_members for update using (
  user_id = auth.uid()
) with check (user_id = auth.uid());

create policy "admins read invites" on public.partnership_invites for select using (
  public.is_partnership_admin(partnership_id)
);

create policy "members read tags" on public.tags for select using (public.is_partnership_member(partnership_id));
create policy "members create tags" on public.tags for insert with check (
  public.is_partnership_member(partnership_id) and created_by = auth.uid()
);
create policy "members update tags" on public.tags for update using (public.is_partnership_member(partnership_id));
create policy "members delete tags" on public.tags for delete using (public.is_partnership_member(partnership_id));

create policy "members read visible items" on public.schedule_items for select using (
  public.is_partnership_member(partnership_id)
  and (
    scope = 'shared'
    or created_by = auth.uid()
    or visibility = 'partner_visible'
  )
);
create policy "members create items" on public.schedule_items for insert with check (
  public.is_partnership_member(partnership_id) and created_by = auth.uid()
);
create policy "owners or couple update items" on public.schedule_items for update using (
  public.is_partnership_member(partnership_id)
  and (scope = 'shared' or created_by = auth.uid())
) with check (
  public.is_partnership_member(partnership_id)
  and (scope = 'shared' or created_by = auth.uid())
);
create policy "owners or couple delete items" on public.schedule_items for delete using (
  public.is_partnership_member(partnership_id)
  and (scope = 'shared' or created_by = auth.uid())
);

create policy "members read assignees" on public.schedule_item_assignees for select using (
  exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid() or item.visibility = 'partner_visible')
  )
);
create policy "item editors manage assignees" on public.schedule_item_assignees for all using (
  exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid())
  )
) with check (
  exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid())
  )
);

create policy "members read item tags" on public.schedule_item_tags for select using (
  exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid() or item.visibility = 'partner_visible')
  )
);
create policy "item editors manage item tags" on public.schedule_item_tags for all using (
  exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid())
  )
) with check (
  exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid())
  )
);

create policy "members read visible overrides" on public.occurrence_overrides for select using (
  exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid() or item.visibility = 'partner_visible')
  )
);
create policy "item editors manage overrides" on public.occurrence_overrides for all using (
  exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid())
  )
) with check (
  updated_by = auth.uid() and exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid())
  )
);

create policy "members read visible completions" on public.occurrence_completions for select using (
  exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid() or item.visibility = 'partner_visible')
  )
);
create policy "members add own completion" on public.occurrence_completions for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.schedule_items item
    where item.id = item_id and public.is_partnership_member(item.partnership_id)
      and (item.scope = 'shared' or item.created_by = auth.uid())
  )
);
create policy "members remove own completion" on public.occurrence_completions for delete using (
  user_id = auth.uid()
);

create policy "preferences self read" on public.user_preferences for select using (user_id = auth.uid());
create policy "preferences self update" on public.user_preferences for update using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on function public.create_partnership(text) from public, anon;
revoke all on function public.create_partner_invite(text) from public, anon;
revoke all on function public.get_invite_details(text) from public;
revoke all on function public.accept_partner_invite(text) from public, anon;
revoke all on function public.revoke_partner_invite(uuid) from public, anon;
revoke all on function public.transfer_partnership_admin(uuid) from public, anon;

grant execute on function public.create_partnership(text) to authenticated;
grant execute on function public.create_partner_invite(text) to authenticated;
grant execute on function public.get_invite_details(text) to anon, authenticated;
grant execute on function public.accept_partner_invite(text) to authenticated;
grant execute on function public.revoke_partner_invite(uuid) to authenticated;
grant execute on function public.transfer_partnership_admin(uuid) to authenticated;

revoke update on public.partnership_members from authenticated;
grant update (color) on public.partnership_members to authenticated;
revoke update on public.partnerships from authenticated;
grant update (name) on public.partnerships to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, timezone) on public.profiles to authenticated;

alter publication supabase_realtime add table public.schedule_items;
alter publication supabase_realtime add table public.schedule_item_assignees;
alter publication supabase_realtime add table public.schedule_item_tags;
alter publication supabase_realtime add table public.occurrence_overrides;
alter publication supabase_realtime add table public.occurrence_completions;
alter publication supabase_realtime add table public.tags;
