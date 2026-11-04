begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- Isolated fixtures: two unrelated users, workspaces, lists and entries.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'alice@example.test', 'test-hash-a', now(), '{}'::jsonb, '{"display_name":"Alice"}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'bob@example.test', 'test-hash-b', now(), '{}'::jsonb, '{"display_name":"Bob"}'::jsonb, false, now(), now());

insert into public.workspaces (id, name, created_by) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Alice private space', '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Bob private space', '22222222-2222-4222-8222-222222222222');

insert into public.lists (id, workspace_id, name, kind, created_by) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Alice list', 'tasks', '11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Bob list', 'tasks', '22222222-2222-4222-8222-222222222222');

insert into public.list_entries (id, list_id, title, created_by) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Alice item', '11111111-1111-4111-8111-111111111111'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Bob item', '22222222-2222-4222-8222-222222222222');

insert into public.workspace_invitations (
  id, workspace_id, email, role, token_hash, invited_by, expires_at
) values (
  '99999999-9999-4999-8999-999999999999',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'bob@example.test',
  'member',
  repeat('a', 64),
  '22222222-2222-4222-8222-222222222222',
  now() + interval '7 days'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select is((select count(*)::integer from public.workspaces), 1, 'Alice sees only her own workspace');
select is((select count(*)::integer from public.lists), 1, 'Alice sees only lists in her workspace');
select is((select count(*)::integer from public.list_entries), 1, 'Alice sees only entries in her workspace');
select is((select count(*)::integer from public.profiles where user_id = '22222222-2222-4222-8222-222222222222'), 0, 'Alice cannot see a profile outside her workspaces');
select is((select count(*)::integer from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'), 1, 'Alice can see her own profile');

select lives_ok(
  $$insert into public.list_entries (list_id, title, created_by) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Allowed item', '11111111-1111-4111-8111-111111111111')$$,
  'Alice can add an entry to her own list'
);
select is((select count(*)::integer from public.list_entries where title = 'Allowed item'), 1, 'allowed entry was actually inserted');

select throws_ok(
  $$insert into public.list_entries (list_id, title, created_by) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Cross-tenant item', '11111111-1111-4111-8111-111111111111')$$,
  '42501', null, 'Alice cannot insert into Bob list'
);
select throws_ok(
  $$insert into public.list_entries (list_id, title, created_by, assigned_to) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Wrong assignee', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'Alice cannot assign an entry to a non-member'
);
select is_empty(
  $$update public.list_entries set title = 'stolen' where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff' returning id$$,
  'Alice cannot update Bob entries'
);
select is_empty(
  $$delete from public.list_entries where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff' returning id$$,
  'Alice cannot delete Bob entries'
);
select throws_ok(
  $$update public.workspace_members set role = 'owner' where workspace_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and user_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', null, 'Alice cannot directly change membership roles'
);
select throws_ok(
  $$select public.accept_workspace_invitation(repeat('a', 64))$$,
  '42501', null, 'Alice cannot claim an invitation addressed to Bob'
);
select throws_ok(
  $$select public.remove_workspace_member('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'Alice cannot remove a member from Bob workspace'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select is((select count(*)::integer from public.workspaces), 1, 'Bob sees only his own workspace');
select is((select count(*)::integer from public.profiles where user_id = '22222222-2222-4222-8222-222222222222'), 1, 'Bob can see his own profile');
select is((select count(*)::integer from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'), 0, 'Bob cannot see Alice profile');

reset role;
delete from public.workspaces where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is((select count(*)::integer from public.workspace_members where workspace_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'deleting a workspace cascades its owner membership');

select * from finish();
rollback;
