-- Role checks must also reject anonymous Auth users, including stale or imported memberships.
create or replace function private.has_workspace_role(
  target_workspace uuid,
  allowed_roles public.workspace_role[]
)
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
        and wm.role = any(allowed_roles)
    );
$$;
