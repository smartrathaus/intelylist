-- Account deletion: preserve shared workspace content while anonymizing authorship.
-- Workspace creators remain RESTRICTed; an owner must delete their workspace first.

alter table public.lists alter column created_by drop not null;
alter table public.lists drop constraint if exists lists_created_by_fkey;
alter table public.lists
  add constraint lists_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.list_entries alter column created_by drop not null;
alter table public.list_entries drop constraint if exists list_entries_created_by_fkey;
alter table public.list_entries
  add constraint list_entries_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.workspace_invitations alter column invited_by drop not null;
alter table public.workspace_invitations drop constraint if exists workspace_invitations_invited_by_fkey;
alter table public.workspace_invitations
  add constraint workspace_invitations_invited_by_fkey
  foreign key (invited_by) references auth.users(id) on delete set null;

-- Permit only FK-driven author anonymization during a nested auth.users deletion.
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
    if new.workspace_id is distinct from old.workspace_id
       or (new.created_by is distinct from old.created_by
           and not (new.created_by is null and pg_trigger_depth() > 1)) then
      raise exception 'Workspace and creator cannot be changed' using errcode = '42501';
    end if;
  elsif tg_table_name = 'list_entries' then
    if new.list_id is distinct from old.list_id
       or (new.created_by is distinct from old.created_by
           and not (new.created_by is null and pg_trigger_depth() > 1)) then
      raise exception 'List and creator cannot be changed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
