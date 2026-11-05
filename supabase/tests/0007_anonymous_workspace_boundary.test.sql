begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
values
 ('41111111-1111-4111-8111-111111111111','authenticated','authenticated','workspace-owner@example.test','test',now(),'{}','{}',now(),now(),false),
 ('42222222-2222-4222-8222-222222222222','authenticated','authenticated',null,'test',now(),'{}','{}',now(),now(),true),
 ('43333333-3333-4333-8333-333333333333','authenticated','authenticated','workspace-member@example.test','test',now(),'{}','{}',now(),now(),false);
insert into public.workspaces(id,name,created_by)
values('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Anonymous Boundary','41111111-1111-4111-8111-111111111111');
-- Simulate stale/imported memberships to prove the helper and privileged RPCs reject anonymous identities.
insert into public.workspace_members(workspace_id,user_id,role) values
 ('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','42222222-2222-4222-8222-222222222222','owner'),
 ('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','43333333-3333-4333-8333-333333333333','member');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"42222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":true}',true);
select ok(not private.is_workspace_member('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'anonymous user is never treated as a workspace member');
select ok(not private.has_workspace_role('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',array['owner']::public.workspace_role[]),'anonymous user never receives workspace owner privileges');
select is((select count(*)::integer from public.workspaces),0,'anonymous user cannot read workspace data even with a stale membership row');
select throws_ok(
 $insert into public.workspaces(name,created_by) values('Guest workspace','42222222-2222-4222-8222-222222222222')$,
 '42501', null, 'anonymous QR guest cannot create a workspace'
);
select throws_ok($select private.leave_workspace('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$,'42501',null,'anonymous user cannot leave or mutate workspace membership through privileged RPC');
select throws_ok($select private.remove_workspace_member('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','43333333-3333-4333-8333-333333333333')$,'42501',null,'anonymous user cannot remove a workspace member through privileged RPC');
select * from finish();
rollback;
