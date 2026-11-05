-- Defense in depth: SECURITY DEFINER workspace RPCs must not accept anonymous Auth sessions.
create or replace function private.accept_workspace_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_email text;
  actor_verified boolean;
  invitation public.workspace_invitations%rowtype;
begin
  if actor_id is null
     or coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'A permanent authenticated account is required' using errcode = '42501';
  end if;

  select lower(u.email), (u.email_confirmed_at is not null)
    into actor_email, actor_verified
  from auth.users u where u.id = actor_id;

  if actor_email is null or not actor_verified then
    raise exception 'A verified email address is required' using errcode = '42501';
  end if;

  select * into invitation
  from public.workspace_invitations wi
  where wi.token_hash = p_token_hash
  for update;

  if not found or invitation.accepted_at is not null or invitation.expires_at <= now() then
    raise exception 'Invitation is invalid or expired' using errcode = '22023';
  end if;

  if lower(invitation.email) <> actor_email then
    raise exception 'Invitation belongs to another email address' using errcode = '42501';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (invitation.workspace_id, actor_id, invitation.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations set accepted_at = now() where id = invitation.id;
  return invitation.workspace_id;
end;
$$;

create or replace function private.leave_workspace(target_workspace uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.workspace_role;
begin
  if actor_id is null
     or coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'A permanent authenticated account is required' using errcode = '42501';
  end if;

  select role into actor_role
  from public.workspace_members
  where workspace_id = target_workspace and user_id = actor_id;

  if actor_role is null then
    raise exception 'Workspace membership required' using errcode = '42501';
  end if;
  if actor_role = 'owner' then
    raise exception 'The owner must delete the workspace or transfer ownership before leaving' using errcode = '42501';
  end if;

  update public.list_entries e
  set assigned_to = null
  from public.lists l
  where e.list_id = l.id and l.workspace_id = target_workspace and e.assigned_to = actor_id;

  delete from public.workspace_members
  where workspace_id = target_workspace and user_id = actor_id;
end;
$$;

create or replace function private.remove_workspace_member(target_workspace uuid, target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.workspace_role;
  target_role public.workspace_role;
begin
  if actor_id is null
     or coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'A permanent authenticated account is required' using errcode = '42501';
  end if;

  select role into actor_role from public.workspace_members
  where workspace_id = target_workspace and user_id = actor_id;
  select role into target_role from public.workspace_members
  where workspace_id = target_workspace and user_id = target_user;

  if actor_role is null or actor_role not in ('owner','admin') then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;
  if target_user = actor_id or target_role is null or target_role = 'owner' then
    raise exception 'Member cannot be removed' using errcode = '22023';
  end if;
  if actor_role = 'admin' and target_role <> 'member' then
    raise exception 'Admins may remove members only' using errcode = '42501';
  end if;

  update public.list_entries e
  set assigned_to = null
  from public.lists l
  where e.list_id = l.id and l.workspace_id = target_workspace and e.assigned_to = target_user;

  delete from public.workspace_members
  where workspace_id = target_workspace and user_id = target_user;
end;
$$;

create or replace function private.can_view_profile(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members target_member
    join public.workspace_members viewer_member
      on viewer_member.workspace_id = target_member.workspace_id
    where target_member.user_id = target_user
      and private.is_workspace_member(viewer_member.workspace_id)
  );
$$;
