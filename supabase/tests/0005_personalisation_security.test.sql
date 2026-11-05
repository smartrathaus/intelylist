begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('11111111-1111-4111-8111-111111111111','authenticated','authenticated','owner2@example.test','test-hash',now(),'{}','{}',now(),now()),
('22222222-2222-4222-8222-222222222222','authenticated','authenticated','member2@example.test','test-hash',now(),'{}','{}',now(),now());
insert into public.workspaces(id,name,created_by) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Shared preferences','11111111-1111-4111-8111-111111111111');
insert into public.workspace_members(workspace_id,user_id,role) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','member');
insert into public.user_preferences(user_id,theme,color_mode,accent_color) values('11111111-1111-4111-8111-111111111111','ocean-blue','dark','#3478bd');

set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select lives_ok($$insert into public.user_preferences(user_id,theme) values('22222222-2222-4222-8222-222222222222','soft-lavender')$$,'user can save their own appearance preferences');
select is((select count(*)::integer from public.user_preferences where user_id='11111111-1111-4111-8111-111111111111'),0,'member cannot read another users appearance preferences');
select lives_ok($$insert into public.user_item_preferences(user_id,workspace_id,normalized_title,display_title,is_favorite) values('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','milch','Milch',true)$$,'member can save personal favorites in a shared workspace');
select throws_ok($$insert into public.user_item_preferences(user_id,workspace_id,normalized_title,display_title) values('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','brot','Brot')$$,'42501',null,'member cannot write another users favorites');
select lives_ok($$insert into public.list_templates(workspace_id,name,kind,entries,created_by) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Wocheneinkauf','shopping','[{"title":"Milch"}]'::jsonb,'22222222-2222-4222-8222-222222222222')$$,'workspace member can create a bounded reusable list template');
select lives_ok($$insert into public.user_notifications(user_id,workspace_id,title,remind_at) values('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Erinnerung',now()+interval '1 hour')$$,'user can create a personal reminder in a shared workspace');
select is((select count(*)::integer from public.user_notifications where user_id='11111111-1111-4111-8111-111111111111'),0,'member cannot read another users reminders');
select * from finish();
rollback;
