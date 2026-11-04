-- Security hardening for the initial schema.
-- This migration deliberately removes direct membership role/deletion writes.
-- Role management and invitation workflows must go through reviewed server-side RPCs.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace and wm.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_workspace_role(target_workspace uuid, allowed_roles public.workspace_role[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.has_workspace_role(uuid, public.workspace_role[]) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

-- Replace all policies to use helpers in the non-exposed private schema.
drop policy if exists "members read workspaces" on public.workspaces;
drop policy if exists "owners update workspaces" on public.workspaces;
drop policy if exists "owners delete workspaces" on public.workspaces;
drop policy if exists "members read memberships" on public.workspace_members;
drop policy if exists "admins add memberships" on public.workspace_members;
drop policy if exists "admins update memberships" on public.workspace_members;
drop policy if exists "admins remove memberships" on public.workspace_members;
drop policy if exists "members read lists" on public.lists;
drop policy if exists "members create lists" on public.lists;
drop policy if exists "members update lists" on public.lists;
drop policy if exists "admins delete lists" on public.lists;
drop policy if exists "members read entries" on public.list_entries;
drop policy if exists "members create entries" on public.list_entries;
drop policy if exists "members update entries" on public.list_entries;
drop policy if exists "admins delete entries" on public.list_entries;
drop policy if exists "admins read invitations" on public.workspace_invitations;
drop policy if exists "admins create invitations" on public.workspace_invitations;
drop policy if exists "admins revoke invitations" on public.workspace_invitations;

create policy "members read workspaces" on public.workspaces
for select to authenticated using ((select private.is_workspace_member(id)));
create policy "users create own workspaces" on public.workspaces
for insert to authenticated with check (created_by = (select auth.uid()));
create policy "owners update workspaces" on public.workspaces
for update to authenticated
using ((select private.has_workspace_role(id, array['owner']::public.workspace_role[])))
with check ((select private.has_workspace_role(id, array['owner']::public.workspace_role[])));
create policy "owners delete workspaces" on public.workspaces
for delete to authenticated using ((select private.has_workspace_role(id, array['owner']::public.workspace_role[])));

create policy "members read memberships" on public.workspace_members
for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "admins add memberships" on public.workspace_members
for insert to authenticated
with check (
  user_id is not null
  and role <> 'owner'
  and (
    (role = 'member' and (select private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])))
    or
    (role = 'admin' and (select private.has_workspace_role(workspace_id, array['owner']::public.workspace_role[])))
  )
);

create policy "members read lists" on public.lists
for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "members create lists" on public.lists
for insert to authenticated
with check (created_by = (select auth.uid()) and (select private.is_workspace_member(workspace_id)));
create policy "members update lists" on public.lists
for update to authenticated
using ((select private.is_workspace_member(workspace_id)))
with check ((select private.is_workspace_member(workspace_id)));
create policy "admins delete lists" on public.lists
for delete to authenticated
using ((select private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])));

create policy "members read entries" on public.list_entries
for select to authenticated using (
  exists (select 1 from public.lists l where l.id = list_id and (select private.is_workspace_member(l.workspace_id)))
);
create policy "members create entries" on public.list_entries
for insert to authenticated with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.lists l where l.id = list_id and (select private.is_workspace_member(l.workspace_id)))
  and (assigned_to is null or exists (
    select 1 from public.lists l join public.workspace_members wm on wm.workspace_id = l.workspace_id
    where l.id = list_id and wm.user_id = assigned_to
  ))
);
create policy "members update entries" on public.list_entries
for update to authenticated using (
  exists (select 1 from public.lists l where l.id = list_id and (select private.is_workspace_member(l.workspace_id)))
) with check (
  exists (select 1 from public.lists l where l.id = list_id and (select private.is_workspace_member(l.workspace_id)))
  and (assigned_to is null or exists (
    select 1 from public.lists l join public.workspace_members wm on wm.workspace_id = l.workspace_id
    where l.id = list_id and wm.user_id = assigned_to
  ))
);
create policy "admins delete entries" on public.list_entries
for delete to authenticated using (
  exists (select 1 from public.lists l where l.id = list_id
    and (select private.has_workspace_role(l.workspace_id, array['owner','admin']::public.workspace_role[])))
);

create policy "admins read invitations" on public.workspace_invitations
for select to authenticated using ((select private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])));
create policy "admins create invitations" on public.workspace_invitations
for insert to authenticated with check (
  invited_by = (select auth.uid()) and role <> 'owner'
  and (select private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
);
create policy "admins revoke invitations" on public.workspace_invitations
for delete to authenticated using ((select private.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])));

-- RLS alone does not prevent moving a row into another tenant. Keep tenant keys immutable.
create or replace function private.prevent_tenant_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'workspaces' then
    if new.created_by is distinct from old.created_by then
      raise exception 'Workspace creator cannot be changed' using errcode = '42501';
    end if;
  elsif tg_table_name = 'lists' then
    if new.workspace_id is distinct from old.workspace_id or new.created_by is distinct from old.created_by then
      raise exception 'Workspace and creator cannot be changed' using errcode = '42501';
    end if;
  elsif tg_table_name = 'list_entries' then
    if new.list_id is distinct from old.list_id or new.created_by is distinct from old.created_by then
      raise exception 'List and creator cannot be changed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger workspaces_prevent_creator_reassignment
before update on public.workspaces
for each row execute function private.prevent_tenant_reassignment();

create trigger lists_prevent_tenant_reassignment
before update on public.lists
for each row execute function private.prevent_tenant_reassignment();

create trigger entries_prevent_tenant_reassignment
before update on public.list_entries
for each row execute function private.prevent_tenant_reassignment();

-- An owner row is never deleted or demoted by direct table access.
create or replace function private.protect_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Direct owner-row deletion is blocked; nested FK cascade from deleting the workspace is allowed.
    if old.role = 'owner' and pg_trigger_depth() <= 1 then
      raise exception 'Workspace owner must be transferred explicitly' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.role = 'owner' and new.role is distinct from old.role then
    raise exception 'Workspace owner must be transferred explicitly' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workspace_members_protect_owner
before update or delete on public.workspace_members
for each row execute function private.protect_workspace_owner();

-- The client may not change roles or delete memberships directly.
revoke all on table public.workspace_members from anon, authenticated;
grant select, insert on table public.workspace_members to authenticated;

-- Explicit grants: policies and SQL privileges are separate security layers.
revoke all on table public.workspaces, public.lists, public.list_entries, public.workspace_invitations from anon, authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.list_entries to authenticated;
grant select, insert, delete on public.workspace_invitations to authenticated;

-- Do not leave security-definer helpers callable in the exposed public schema.
drop trigger if exists workspaces_add_creator_as_owner on public.workspaces;
drop function if exists public.add_workspace_creator_as_owner();
drop function if exists public.is_workspace_member(uuid);
drop function if exists public.has_workspace_role(uuid, public.workspace_role[]);

create or replace function private.add_workspace_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger workspaces_add_creator_as_owner
after insert on public.workspaces
for each row execute function private.add_workspace_creator_as_owner();

-- Keep timestamps trustworthy even when updates come from clients.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function private.set_updated_at();
create trigger lists_set_updated_at before update on public.lists
for each row execute function private.set_updated_at();
create trigger entries_set_updated_at before update on public.list_entries
for each row execute function private.set_updated_at();

-- Members may remove individual entries; list and workspace administration remains role-restricted.
create policy "members delete entries" on public.list_entries
for delete to authenticated using (
  exists (select 1 from public.lists l where l.id = list_id and (select private.is_workspace_member(l.workspace_id)))
);

-- Enable database change broadcasts for collaborative lists when the standard Supabase publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_entries'
     ) then
    alter publication supabase_realtime add table public.list_entries;
  end if;
end;
$$;

-- Private helper/trigger functions are never directly callable through SQL API grants.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
