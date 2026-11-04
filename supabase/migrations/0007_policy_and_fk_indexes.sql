-- Remove redundant permissive DELETE policy and index FK columns used for joins/deletes.
drop policy if exists "admins delete entries" on public.list_entries;

create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspaces_created_by_idx on public.workspaces(created_by);
create index if not exists lists_created_by_idx on public.lists(created_by);
create index if not exists list_entries_created_by_idx on public.list_entries(created_by);
create index if not exists workspace_invitations_invited_by_idx on public.workspace_invitations(invited_by);

notify pgrst, 'reload schema';