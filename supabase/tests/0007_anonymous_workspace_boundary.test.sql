begin;
create extension if not exists pgtap with schema extensions;
select plan(1);
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
values ('42222222-2222-4222-8222-222222222222','authenticated','authenticated',null,'test',now(),'{}','{}',now(),now(),true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"42222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":true}',true);
select throws_ok(
 $$insert into public.workspaces(name,created_by) values('Guest workspace','42222222-2222-4222-8222-222222222222')$$,
 '42501', null, 'anonymous QR guest cannot create a workspace'
);
select * from finish();
rollback;
