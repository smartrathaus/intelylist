-- Allow non-owners to leave a workspace while protecting the single owner.
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
  select role into actor_role
  from public.workspace_members
  where workspace_id = target_workspace and user_id = actor_id;

  if actor_id is null or actor_role is null then
    raise exception 'Workspace membership required' using errcode = '42501';
  end if;
  if actor_role = 'owner' then
    raise exception 'The owner must delete the workspace or transfer ownership before leaving' using errcode = '42501';
  end if;

  update public.list_entries e
  set assigned_to = null
  from public.lists l
  where e.list_id = l.id
    and l.workspace_id = target_workspace
    and e.assigned_to = actor_id;

  delete from public.workspace_members
  where workspace_id = target_workspace and user_id = actor_id;
end;
$$;

create or replace function public.leave_workspace(target_workspace uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.leave_workspace(target_workspace);
$$;

revoke all on function private.leave_workspace(uuid) from public, anon, authenticated;
grant execute on function private.leave_workspace(uuid) to authenticated;
revoke all on function public.leave_workspace(uuid) from public, anon;
grant execute on function public.leave_workspace(uuid) to authenticated;

notify pgrst, 'reload schema';
