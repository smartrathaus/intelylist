-- Keep QR guests from rewriting entry ownership or moving entries between lists.
-- Workspace members retain the existing collaborative editing behavior.
create or replace function private.prevent_guest_entry_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select l.workspace_id into v_workspace_id
  from public.lists l
  where l.id = old.list_id;

  if private.is_list_guest(old.list_id)
     and not private.is_workspace_member(v_workspace_id)
     and (
       new.created_by is distinct from old.created_by
       or new.list_id is distinct from old.list_id
       or new.assigned_to is not null
     )
  then
    raise exception 'guest users cannot change entry ownership, list, or assignment'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_guest_entry_reassignment() from public, anon, authenticated;

drop trigger if exists prevent_guest_entry_reassignment on public.list_entries;
create trigger prevent_guest_entry_reassignment
before update on public.list_entries
for each row execute function private.prevent_guest_entry_reassignment();
