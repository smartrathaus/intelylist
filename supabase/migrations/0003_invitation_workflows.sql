-- Secure invitation acceptance and member administration.
-- Raw invitation tokens never enter the database; only SHA-256 hashes are stored.

drop policy if exists "admins add memberships" on public.workspace_members;
revoke insert on table public.workspace_members from authenticated;

drop policy if exists "admins create invitations" on public.workspace_invitations;
create policy "admins create invitations" on public.workspace_invitations
for insert to authenticated with check (
  invited_by = (select auth.uid())
  and role <> 'owner'
  and (
    (role = 'member' and (select private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])))
    or
    (role = 'admin' and (select private.has_workspace_role(workspace_id, array['owner']::public.workspace_role[])))
  )
);

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
  if actor_id is null then
    raise exception 'Authentication required' using errcode = '28000';
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

  update public.workspace_invitations
  set accepted_at = now()
  where id = invitation.id;

  return invitation.workspace_id;
end;
$$;

create or replace function public.accept_workspace_invitation(token_hash text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_workspace_invitation(token_hash);
$$;

create or replace function private.change_workspace_member_role(
  target_workspace uuid,
  target_user uuid,
  new_role public.workspace_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not (select private.has_workspace_role(target_workspace, array['owner']::public.workspace_role[])) then
    raise exception 'Only the workspace owner may change member roles' using errcode = '42501';
  end if;
  if new_role = 'owner' or target_user = (select auth.uid()) then
    raise exception 'Owner transfer and self-role changes are not supported' using errcode = '22023';
  end if;
  update public.workspace_members
  set role = new_role
  where workspace_id = target_workspace and user_id = target_user and role <> 'owner';
  if not found then
    raise exception 'Member not found or cannot be changed' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.change_workspace_member_role(
  target_workspace uuid,
  target_user uuid,
  new_role public.workspace_role
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.change_workspace_member_role(target_workspace, target_user, new_role);
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
  select role into actor_role from public.workspace_members
  where workspace_id = target_workspace and user_id = actor_id;

  select role into target_role from public.workspace_members
  where workspace_id = target_workspace and user_id = target_user;

  if actor_role not in ('owner','admin') or actor_id is null then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;
  if target_user = actor_id or target_role is null or target_role = 'owner' then
    raise exception 'Member cannot be removed' using errcode = '22023';
  end if;
  if actor_role = 'admin' and target_role <> 'member' then
    raise exception 'Admins may remove members only' using errcode = '42501';
  end if;

  delete from public.workspace_members
  where workspace_id = target_workspace and user_id = target_user;
end;
$$;

create or replace function public.remove_workspace_member(target_workspace uuid, target_user uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.remove_workspace_member(target_workspace, target_user);
$$;

revoke all on function private.accept_workspace_invitation(text) from public, anon, authenticated;
revoke all on function private.change_workspace_member_role(uuid, uuid, public.workspace_role) from public, anon, authenticated;
revoke all on function private.remove_workspace_member(uuid, uuid) from public, anon, authenticated;
grant execute on function private.accept_workspace_invitation(text) to authenticated;
grant execute on function private.change_workspace_member_role(uuid, uuid, public.workspace_role) to authenticated;
grant execute on function private.remove_workspace_member(uuid, uuid) to authenticated;

revoke all on function public.accept_workspace_invitation(text) from public, anon;
revoke all on function public.change_workspace_member_role(uuid, uuid, public.workspace_role) from public, anon;
revoke all on function public.remove_workspace_member(uuid, uuid) from public, anon;
grant execute on function public.accept_workspace_invitation(text) to authenticated;
grant execute on function public.change_workspace_member_role(uuid, uuid, public.workspace_role) to authenticated;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated;
