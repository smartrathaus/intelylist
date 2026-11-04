begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'owner@example.test', 'test-hash-owner', now(), '{}'::jsonb, '{"display_name":"Owner"}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'member@example.test', 'test-hash-member', now(), '{}'::jsonb, '{"display_name":"Member"}'::jsonb, now(), now());

insert into public.workspaces (id, name, created_by)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Shared', '11111111-1111-4111-8111-111111111111');

insert into public.lists (id, workspace_id, name, kind, created_by)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Tasks', 'tasks', '11111111-1111-4111-8111-111111111111');

insert into public.workspace_invitations (
  id, workspace_id, email, role, token_hash, invited_by, expires_at
) values (
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'member@example.test',
  'member',
  repeat('b', 64),
  '11111111-1111-4111-8111-111111111111',
  now() + interval '7 days'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

select lives_ok($$select public.accept_workspace_invitation(repeat('b', 64))$$, 'invited user can accept a valid invitation');
select is((select role::text from public.workspace_members where workspace_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and user_id = '22222222-2222-4222-8222-222222222222'), 'member', 'invitation grants only the invited role');
select lives_ok($$insert into public.list_entries (list_id, title, created_by, assigned_to) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Assigned task', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222')$$, 'member can create and assign an entry to themselves');
select lives_ok($$select public.leave_workspace('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$, 'non-owner can leave a workspace');
select is((select count(*)::integer from public.workspace_members where user_id = '22222222-2222-4222-8222-222222222222'), 0, 'leaving removes the membership');
select is((select count(*)::integer from public.list_entries where assigned_to = '22222222-2222-4222-8222-222222222222'), 0, 'leaving clears assignments in that workspace');
select is((select count(*)::integer from public.workspaces), 0, 'former member no longer sees the workspace');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select throws_ok($$select public.leave_workspace('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$, '42501', null, 'owner cannot leave without deleting or transferring the workspace');
select is((select count(*)::integer from public.workspaces), 1, 'owner retains access to the workspace');

select * from finish();
rollback;
