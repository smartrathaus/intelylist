begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'owner@example.test', 'test-hash-owner', now(), '{}'::jsonb, '{"display_name":"Owner"}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'member@example.test', 'test-hash-member', now(), '{}'::jsonb, '{"display_name":"Member"}'::jsonb, now(), now());

insert into public.workspaces (id, name, created_by)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner space', '11111111-1111-4111-8111-111111111111');

insert into public.workspace_invitations (
  id, workspace_id, email, role, token_hash, invited_by, expires_at
) values (
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'member@example.test',
  'member',
  repeat('c', 64),
  '11111111-1111-4111-8111-111111111111',
  now() + interval '7 days'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select lives_ok($$select public.accept_workspace_invitation(repeat('c', 64))$$, 'member accepts invitation before account deletion');
select lives_ok($$insert into public.lists (workspace_id, name, kind, created_by) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Member list', 'tasks', '22222222-2222-4222-8222-222222222222')$$, 'member can create a list');
select lives_ok($$insert into public.list_entries (list_id, title, created_by, assigned_to) select id, 'Member entry', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222' from public.lists where name = 'Member list'$$, 'member can create an assigned entry');

reset role;
insert into public.workspace_invitations (
  workspace_id, email, role, token_hash, invited_by, expires_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'third@example.test',
  'member',
  repeat('d', 64),
  '22222222-2222-4222-8222-222222222222',
  now() + interval '7 days'
);

select lives_ok($$delete from auth.users where id = '22222222-2222-4222-8222-222222222222'$$, 'non-owner account can be deleted');
select is((select count(*)::integer from public.workspace_members where user_id = '22222222-2222-4222-8222-222222222222'), 0, 'account deletion removes memberships');
select is((select count(*)::integer from public.profiles where user_id = '22222222-2222-4222-8222-222222222222'), 0, 'account deletion removes profile');
select is((select count(*)::integer from public.lists where name = 'Member list' and created_by is null), 1, 'account deletion anonymizes list authorship');
select is((select count(*)::integer from public.list_entries where title = 'Member entry' and created_by is null and assigned_to is null), 1, 'account deletion preserves entries but clears authorship and assignment');
select is((select count(*)::integer from public.workspace_invitations where token_hash = repeat('d', 64) and invited_by is null), 1, 'account deletion anonymizes invitation creator');

select throws_ok($$delete from auth.users where id = '11111111-1111-4111-8111-111111111111'$$, '23503', null, 'workspace owner account cannot be deleted while its workspace exists');

select * from finish();
rollback;
