alter table public.list_entries add column if not exists supermarket text;
update public.list_entries set quantity = greatest(1, round(coalesce(quantity, 1))) where quantity is not null;
alter table public.list_entries drop constraint if exists list_entries_quantity_whole_number_check;
alter table public.list_entries add constraint list_entries_quantity_whole_number_check check (quantity is null or (quantity >= 1 and quantity = trunc(quantity)));
alter table public.lists add column if not exists shopping_session_id uuid;

create table if not exists public.shopping_order_history (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  entry_id uuid not null references public.list_entries(id) on delete cascade,
  session_id uuid not null,
  sequence_position integer not null check (sequence_position > 0),
  completed_at timestamptz not null default now()
);
create index if not exists shopping_order_history_list_session_idx on public.shopping_order_history(list_id, session_id, sequence_position);
create index if not exists shopping_order_history_list_completed_idx on public.shopping_order_history(list_id, completed_at desc);
alter table public.shopping_order_history enable row level security;
drop policy if exists "members read shopping order history" on public.shopping_order_history;
create policy "members read shopping order history" on public.shopping_order_history for select to authenticated
using (exists (select 1 from public.lists l join public.workspace_members wm on wm.workspace_id=l.workspace_id where l.id=list_id and wm.user_id=(select auth.uid())));
drop policy if exists "members insert shopping order history" on public.shopping_order_history;
create policy "members insert shopping order history" on public.shopping_order_history for insert to authenticated
with check (exists (select 1 from public.lists l join public.workspace_members wm on wm.workspace_id=l.workspace_id where l.id=list_id and wm.user_id=(select auth.uid())));
create or replace function public.set_list_entry_completion(target_entry uuid,target_list uuid,completed boolean)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare current_session uuid; next_position integer;
begin
 update public.list_entries set is_completed=completed,completed_at=case when completed then now() else null end,updated_at=now()
 where id=target_entry and list_id=target_list;
 if not found then raise exception 'Entry not found or not permitted'; end if;
 if completed then
  select shopping_session_id into current_session from public.lists where id=target_list for update;
  if current_session is null then current_session:=gen_random_uuid(); update public.lists set shopping_session_id=current_session where id=target_list; end if;
  select coalesce(max(sequence_position),0)+1 into next_position from public.shopping_order_history where list_id=target_list and session_id=current_session;
  insert into public.shopping_order_history(list_id,entry_id,session_id,sequence_position) values(target_list,target_entry,current_session,next_position);
 else
  if not exists(select 1 from public.list_entries where list_id=target_list and is_completed=true) then update public.lists set shopping_session_id=null where id=target_list; end if;
 end if;
 return current_session;
end; $$;
revoke all on function public.set_list_entry_completion(uuid,uuid,boolean) from public;
grant execute on function public.set_list_entry_completion(uuid,uuid,boolean) to authenticated;