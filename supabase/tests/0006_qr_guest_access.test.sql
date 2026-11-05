begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
values
('31111111-1111-4111-8111-111111111111','authenticated','authenticated','qr-owner@example.test','test',now(),'{}','{}',now(),now(),false),
('32222222-2222-4222-8222-222222222222','authenticated','authenticated',null,'test',now(),'{}','{}',now(),now(),true),
('33333333-3333-4333-8333-333333333333','authenticated','authenticated','other@example.test','test',now(),'{}','{}',now(),now(),false);
insert into public.workspaces(id,name,created_by) values('3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','QR Test','31111111-1111-4111-8111-111111111111');
insert into public.lists(id,workspace_id,name,kind,created_by) values
 ('3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Geteilte Liste','shopping','31111111-1111-4111-8111-111111111111'),
 ('3ddddddd-dddd-4ddd-8ddd-dddddddddddd','3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Interne Liste','tasks','31111111-1111-4111-8111-111111111111');
insert into public.list_guest_invites(id,list_id,token_hash,created_by,expires_at,max_uses)
values('3ccccccc-cccc-4ccc-8ccc-cccccccccccc','3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',encode(extensions.digest('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq','sha256'),'hex'),'31111111-1111-4111-8111-111111111111',now()+interval '1 day',2);

set local role authenticated;
select set_config('request.jwt.claim.sub','32222222-2222-4222-8222-222222222222',true);
select lives_ok($$select * from public.redeem_list_guest_invite('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq')$$,'anonymous guest can redeem a valid QR token');
select ok(private.is_list_guest('3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),'guest is scoped to invited list');
select lives_ok($insert into public.list_entries(list_id,title,created_by,assigned_to) values('3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Gastartikel','32222222-2222-4222-8222-222222222222',null)$,'guest can add an unassigned list entry');
select throws_ok($update public.list_entries set created_by='31111111-1111-4111-8111-111111111111' where title='Gastartikel'$,'42501',null,'guest cannot rewrite entry creator');
select throws_ok($update public.list_entries set assigned_to='31111111-1111-4111-8111-111111111111' where title='Gastartikel'$,'42501',null,'guest cannot assign an existing entry');
select throws_ok($$insert into public.list_entries(list_id,title,created_by,assigned_to) values('3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Falsche Zuweisung','32222222-2222-4222-8222-222222222222','31111111-1111-4111-8111-111111111111')$$,'42501',null,'guest cannot assign entries to workspace members');
select is((select count(*)::integer from public.workspaces),0,'guest cannot read the containing workspace');
select is((select count(*)::integer from public.lists where id='3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),1,'guest can read only the shared list');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select is((select count(*)::integer from public.list_entries where list_id='3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),0,'uninvited user cannot read guest list entries');
select * from finish();
rollback;