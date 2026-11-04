begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select has_table('public', 'workspaces', 'workspaces table exists');
select has_table('public', 'workspace_members', 'workspace_members table exists');
select has_table('public', 'lists', 'lists table exists');
select has_table('public', 'list_entries', 'list_entries table exists');
select has_table('public', 'workspace_invitations', 'workspace_invitations table exists');

select ok((select relrowsecurity from pg_class where oid = 'public.workspaces'::regclass), 'RLS enabled on workspaces');
select ok((select relrowsecurity from pg_class where oid = 'public.workspace_members'::regclass), 'RLS enabled on workspace_members');
select ok((select relrowsecurity from pg_class where oid = 'public.lists'::regclass), 'RLS enabled on lists');
select ok((select relrowsecurity from pg_class where oid = 'public.list_entries'::regclass), 'RLS enabled on list_entries');
select ok((select relrowsecurity from pg_class where oid = 'public.workspace_invitations'::regclass), 'RLS enabled on workspace_invitations');

select ok(has_function_privilege('authenticated', 'private.is_workspace_member(uuid)', 'EXECUTE'), 'authenticated can call the RLS membership helper');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'UPDATE'), 'members cannot directly update membership roles');

select * from finish();
rollback;