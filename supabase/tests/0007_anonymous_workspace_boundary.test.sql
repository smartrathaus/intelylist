begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
values
 ('41111111-1111-4111-8111-111111111111','authenticated','authenticated','workspace-owner@example.test','test',now(),'{}','{}',now(),now(),false),
 ('42222222-2222-4222-8222-222222222222','authenticated','authenticated',null,'test',now(),'{}','{}',now(),now(),true);
insert into public.workspaces(id,name,created_by)
values('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Anonymous Boundary','41111111-1111-4111-8111-111111111111');
-- Simulate a stale/imported membership to prove the helper itself rejects anonymous identities.
insert into public.workspace_members(workspace_id,user_id,role)
values('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','42222222-2222-4222-8222-222222222222','owner');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"42222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":true}',true);
select ok(not private.is_workspace_member('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'anonymous user is never treated as a workspace member');
select ok(not private.has_workspace_role('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',array['owner']::public.workspace_role[]),'anonymous user never receives workspace owner privileges');
select is((select count(*)::integer from public.workspaces),0,'anonymous user cannot read workspace data even with a stale membership row');
select throws_ok(
 $$insert into public.workspaces(name,created_by) values('Guest workspace','42222222-2222-4222-8222-222222222222')$$,
 '42501', null, 'anonymous QR guest cannot create a workspace'
);
select * from finish();
rollback;
