-- intelylist initial multi-user schema
-- Apply to a fresh Supabase project. Workspace data is protected by RLS.

create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.list_kind as enum ('tasks', 'shopping', 'mixed');
create type public.entry_priority as enum ('low', 'normal', 'high', 'urgent');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  kind public.list_kind not null default 'tasks',
  created_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.list_entries (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  notes text,
  is_completed boolean not null default false,
  priority public.entry_priority not null default 'normal',
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  quantity numeric(10,2) check (quantity is null or quantity > 0),
  unit text check (unit is null or char_length(unit) <= 32),
  category text check (category is null or char_length(category) <= 80),
  position integer not null default 0,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index lists_workspace_id_idx on public.lists(workspace_id);
create index list_entries_list_id_position_idx on public.list_entries(list_id, position);
create index list_entries_assigned_to_idx on public.list_entries(assigned_to);
create index list_entries_due_at_idx on public.list_entries(due_at) where due_at is not null;
create index workspace_invitations_workspace_idx on public.workspace_invitations(workspace_id);

-- SECURITY DEFINER helpers prevent recursive membership-policy evaluation.
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace and wm.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_workspace_role(target_workspace uuid, allowed_roles public.workspace_role[])
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

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, public.workspace_role[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;

-- Every creator becomes the initial owner atomically.
create or replace function public.add_workspace_creator_as_owner()
returns trigger
language plpgsql security definer
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
for each row execute function public.add_workspace_creator_as_owner();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.lists enable row level security;
alter table public.list_entries enable row level security;
alter table public.workspace_invitations enable row level security;

create policy "members read workspaces" on public.workspaces
for select to authenticated using (public.is_workspace_member(id));
create policy "users create own workspaces" on public.workspaces
for insert to authenticated with check (created_by = (select auth.uid()));
create policy "owners update workspaces" on public.workspaces
for update to authenticated
using (public.has_workspace_role(id, array['owner']::public.workspace_role[]))
with check (public.has_workspace_role(id, array['owner']::public.workspace_role[]));
create policy "owners delete workspaces" on public.workspaces
for delete to authenticated using (public.has_workspace_role(id, array['owner']::public.workspace_role[]));

create policy "members read memberships" on public.workspace_members
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "admins add memberships" on public.workspace_members
for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "admins update memberships" on public.workspace_members
for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "admins remove memberships" on public.workspace_members
for delete to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "members read lists" on public.lists
for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members create lists" on public.lists
for insert to authenticated
with check (created_by = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "members update lists" on public.lists
for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
create policy "admins delete lists" on public.lists
for delete to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "members read entries" on public.list_entries
for select to authenticated
using (exists (
  select 1 from public.lists l
  where l.id = list_id and public.is_workspace_member(l.workspace_id)
));
create policy "members create entries" on public.list_entries
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.lists l
    where l.id = list_id and public.is_workspace_member(l.workspace_id)
  )
  and (
    assigned_to is null or exists (
      select 1 from public.lists l
      join public.workspace_members wm on wm.workspace_id = l.workspace_id
      where l.id = list_id and wm.user_id = assigned_to
    )
  )
);
create policy "members update entries" on public.list_entries
for update to authenticated
using (exists (
  select 1 from public.lists l
  where l.id = list_id and public.is_workspace_member(l.workspace_id)
))
with check (
  exists (
    select 1 from public.lists l
    where l.id = list_id and public.is_workspace_member(l.workspace_id)
  )
  and (
    assigned_to is null or exists (
      select 1 from public.lists l
      join public.workspace_members wm on wm.workspace_id = l.workspace_id
      where l.id = list_id and wm.user_id = assigned_to
    )
  )
);
create policy "admins delete entries" on public.list_entries
for delete to authenticated
using (exists (
  select 1 from public.lists l
  where l.id = list_id
    and public.has_workspace_role(l.workspace_id, array['owner','admin']::public.workspace_role[])
));

create policy "admins read invitations" on public.workspace_invitations
for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "admins create invitations" on public.workspace_invitations
for insert to authenticated
with check (
  invited_by = (select auth.uid())
  and role <> 'owner'
  and public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])
);
create policy "admins revoke invitations" on public.workspace_invitations
for delete to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

-- Invitation acceptance and role-change RPCs are implemented separately.
-- Before production, add immutable creator/tenant guards and automated RLS tests.
