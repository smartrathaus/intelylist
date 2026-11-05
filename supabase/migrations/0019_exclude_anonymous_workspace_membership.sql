-- Anonymous Auth users share the authenticated Postgres role. They must never
-- inherit workspace membership-based access merely because a membership row exists.
create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = target_workspace
        and wm.user_id = (select auth.uid())
    );
$$;

-- Evaluate JWT claims once per statement for the workspace creation policy.
drop policy if exists "permanent users create own workspaces" on public.workspaces;
create policy "permanent users create own workspaces" on public.workspaces
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);
