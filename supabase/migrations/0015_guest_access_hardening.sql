-- Move token redemption behind a non-exposed schema. Public wrapper is invoker-only.
create or replace function private.redeem_list_guest_invite(raw_token text)
returns table(list_id uuid,list_name text,workspace_name text,expires_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare v_invite public.list_guest_invites%rowtype; v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'authentication required' using errcode='28000'; end if;
 if coalesce(length(raw_token),0) <> 43 then raise exception 'invalid invite' using errcode='22023'; end if;
 select * into v_invite from public.list_guest_invites
 where token_hash=encode(extensions.digest(raw_token,'sha256'),'hex') and revoked_at is null and expires_at>now()
 for update;
 if not found then raise exception 'invite unavailable' using errcode='P0002'; end if;
 if not exists(select 1 from public.list_guest_members where invite_id=v_invite.id and user_id=v_user) then
  if v_invite.use_count>=v_invite.max_uses then raise exception 'invite limit reached' using errcode='P0001'; end if;
  insert into public.list_guest_members(invite_id,list_id,user_id,expires_at) values(v_invite.id,v_invite.list_id,v_user,v_invite.expires_at);
  update public.list_guest_invites set use_count=use_count+1 where id=v_invite.id;
 end if;
 return query select l.id,l.name,w.name,v_invite.expires_at from public.lists l join public.workspaces w on w.id=l.workspace_id where l.id=v_invite.list_id;
end;
$$;
revoke all on function private.redeem_list_guest_invite(text) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.redeem_list_guest_invite(text) to authenticated;
drop function if exists public.redeem_list_guest_invite(text);
create or replace function public.redeem_list_guest_invite(raw_token text)
returns table(list_id uuid,list_name text,workspace_name text,expires_at timestamptz)
language sql security invoker set search_path=''
as $$ select * from private.redeem_list_guest_invite(raw_token); $$;
revoke all on function public.redeem_list_guest_invite(text) from public,anon;
grant execute on function public.redeem_list_guest_invite(text) to authenticated;

create index if not exists list_guest_invites_created_by_idx on public.list_guest_invites(created_by);
create index if not exists list_guest_members_list_id_idx on public.list_guest_members(list_id);

-- Consolidate list access policies to avoid duplicate permissive policies.
drop policy if exists "members read lists" on public.lists;
drop policy if exists "list guests read lists" on public.lists;
create policy "members and guests read lists" on public.lists for select to authenticated
using (private.is_workspace_member(workspace_id) or private.is_list_guest(id));

drop policy if exists "members read entries" on public.list_entries;
drop policy if exists "list guests read entries" on public.list_entries;
create policy "members and guests read entries" on public.list_entries for select to authenticated
using (exists(select 1 from public.lists l where l.id=list_id and (private.is_workspace_member(l.workspace_id) or private.is_list_guest(l.id))));

drop policy if exists "members create entries" on public.list_entries;
drop policy if exists "list guests create entries" on public.list_entries;
create policy "members and guests create entries" on public.list_entries for insert to authenticated
with check (
 created_by=(select auth.uid()) and exists(select 1 from public.lists l where l.id=list_id and
 (private.is_workspace_member(l.workspace_id) or (private.is_list_guest(l.id) and assigned_to is null)))
 and (assigned_to is null or exists(select 1 from public.lists l join public.workspace_members wm on wm.workspace_id=l.workspace_id where l.id=list_id and wm.user_id=assigned_to))
);

drop policy if exists "members update entries" on public.list_entries;
drop policy if exists "list guests update entries" on public.list_entries;
create policy "members and guests update entries" on public.list_entries for update to authenticated
using (exists(select 1 from public.lists l where l.id=list_id and (private.is_workspace_member(l.workspace_id) or private.is_list_guest(l.id))))
with check (
 exists(select 1 from public.lists l where l.id=list_id and
 (private.is_workspace_member(l.workspace_id) or (private.is_list_guest(l.id) and assigned_to is null)))
 and (assigned_to is null or exists(select 1 from public.lists l join public.workspace_members wm on wm.workspace_id=l.workspace_id where l.id=list_id and wm.user_id=assigned_to))
);

drop policy if exists "members delete entries" on public.list_entries;
drop policy if exists "list guests delete entries" on public.list_entries;
drop policy if exists "admins delete entries" on public.list_entries;
create policy "members and guests delete entries" on public.list_entries for delete to authenticated
using (exists(select 1 from public.lists l where l.id=list_id and (private.is_workspace_member(l.workspace_id) or private.is_list_guest(l.id))));

drop policy if exists "members read shopping order history" on public.shopping_order_history;
drop policy if exists "list guests read shopping history" on public.shopping_order_history;
create policy "members and guests read shopping history" on public.shopping_order_history for select to authenticated
using (exists(select 1 from public.lists l where l.id=list_id and (private.is_workspace_member(l.workspace_id) or private.is_list_guest(l.id))));
drop policy if exists "members insert shopping order history" on public.shopping_order_history;
drop policy if exists "list guests add shopping history" on public.shopping_order_history;
create policy "members and guests add shopping history" on public.shopping_order_history for insert to authenticated
with check (exists(select 1 from public.lists l where l.id=list_id and (private.is_workspace_member(l.workspace_id) or private.is_list_guest(l.id))));
