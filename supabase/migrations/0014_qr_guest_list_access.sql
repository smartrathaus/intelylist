-- Temporary QR guest access, scoped to a single list and revocable by its creator.
create table public.list_guest_invites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  max_uses integer not null default 10 check (max_uses between 1 and 100),
  use_count integer not null default 0 check (use_count between 0 and max_uses),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index list_guest_invites_list_idx on public.list_guest_invites(list_id);
alter table public.list_guest_invites enable row level security;
create policy "members read guest invites" on public.list_guest_invites
for select to authenticated using (exists(select 1 from public.lists l where l.id=list_id and private.is_workspace_member(l.workspace_id)));
create policy "members create guest invites" on public.list_guest_invites
for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.lists l where l.id=list_id and private.is_workspace_member(l.workspace_id)));
create policy "creators revoke guest invites" on public.list_guest_invites
for update to authenticated using (created_by=(select auth.uid()) and exists(select 1 from public.lists l where l.id=list_id and private.is_workspace_member(l.workspace_id)))
with check (created_by=(select auth.uid()) and exists(select 1 from public.lists l where l.id=list_id and private.is_workspace_member(l.workspace_id)));
grant select,insert,update on public.list_guest_invites to authenticated;

create table public.list_guest_members (
  invite_id uuid not null references public.list_guest_invites(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  joined_at timestamptz not null default now(),
  primary key(invite_id,user_id)
);
create index list_guest_members_user_list_idx on public.list_guest_members(user_id,list_id,expires_at);
alter table public.list_guest_members enable row level security;
create policy "guests read own guest membership" on public.list_guest_members
for select to authenticated using (user_id=(select auth.uid()));
grant select on public.list_guest_members to authenticated;

create or replace function private.is_list_guest(target_list uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
 select exists(
   select 1 from public.list_guest_members gm
   join public.list_guest_invites gi on gi.id=gm.invite_id
   where gm.list_id=target_list and gm.user_id=(select auth.uid())
     and gm.expires_at>now() and gi.revoked_at is null and gi.expires_at>now()
 );
$$;
revoke all on function private.is_list_guest(uuid) from public;
grant execute on function private.is_list_guest(uuid) to authenticated;

-- Redeem a high-entropy QR token. The invite can be used by multiple guests up to max_uses.
create or replace function public.redeem_list_guest_invite(raw_token text)
returns table(list_id uuid, list_name text, workspace_name text, expires_at timestamptz)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_invite public.list_guest_invites%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'authentication required' using errcode='28000'; end if;
  if coalesce(length(raw_token),0) <> 43 then raise exception 'invalid invite' using errcode='22023'; end if;
  select * into v_invite from public.list_guest_invites
   where token_hash=encode(extensions.digest(raw_token,'sha256'),'hex')
     and revoked_at is null and expires_at>now()
   for update;
  if not found then raise exception 'invite unavailable' using errcode='P0002'; end if;
  if not exists(select 1 from public.list_guest_members where invite_id=v_invite.id and user_id=v_user) then
    if v_invite.use_count >= v_invite.max_uses then raise exception 'invite limit reached' using errcode='P0001'; end if;
    insert into public.list_guest_members(invite_id,list_id,user_id,expires_at)
      values(v_invite.id,v_invite.list_id,v_user,v_invite.expires_at);
    update public.list_guest_invites set use_count=use_count+1 where id=v_invite.id;
  end if;
  return query select l.id,l.name,w.name,v_invite.expires_at
    from public.lists l join public.workspaces w on w.id=l.workspace_id
    where l.id=v_invite.list_id;
end;
$$;
revoke all on function public.redeem_list_guest_invite(text) from public;
grant execute on function public.redeem_list_guest_invite(text) to authenticated;

-- Guests can see and collaborate on entries in exactly the shared list, but cannot assign entries.
create policy "list guests read lists" on public.lists
for select to authenticated using (private.is_list_guest(id));
create policy "list guests read entries" on public.list_entries
for select to authenticated using (private.is_list_guest(list_id));
create policy "list guests create entries" on public.list_entries
for insert to authenticated with check (
  created_by=(select auth.uid()) and assigned_to is null and private.is_list_guest(list_id)
);
create policy "list guests update entries" on public.list_entries
for update to authenticated using (private.is_list_guest(list_id))
with check (private.is_list_guest(list_id) and assigned_to is null);
create policy "list guests delete entries" on public.list_entries
for delete to authenticated using (private.is_list_guest(list_id));

-- Only guests may execute this helper to record their own membership; membership rows cannot be forged via REST.
revoke insert,update,delete on public.list_guest_members from authenticated;
