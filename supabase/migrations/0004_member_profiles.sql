-- Member profiles are visible only to users sharing at least one workspace.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.can_view_profile(target_user uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members target_member
    join public.workspace_members viewer_member
      on viewer_member.workspace_id = target_member.workspace_id
    where target_member.user_id = target_user
      and viewer_member.user_id = (select auth.uid())
  );
$$;

revoke all on function private.can_view_profile(uuid) from public, anon, authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  preferred_name text;
begin
  preferred_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  if preferred_name is null then
    preferred_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;
  insert into public.profiles (user_id, display_name)
  values (new.id, left(coalesce(preferred_name, 'Nutzer'), 80))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

insert into public.profiles (user_id, display_name)
select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
                           nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
                           'Nutzer'), 80)
from auth.users u
on conflict (user_id) do nothing;

create trigger auth_users_create_profile
after insert on auth.users
for each row execute function private.create_profile_for_auth_user();

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, update on table public.profiles to authenticated;

create policy "users read shared workspace profiles" on public.profiles
for select to authenticated
using (user_id = (select auth.uid()) or (select private.can_view_profile(user_id)));

create policy "users update own profile" on public.profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();

revoke execute on function private.create_profile_for_auth_user() from public, anon, authenticated;
