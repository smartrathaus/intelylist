begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

select has_table('public', 'workspaces', 'workspaces table exists');
select has_table('public', 'workspace_members', 'workspace_members table exists');
select has_table('public', 'lists', 'lists table exists');
select has_table('public', 'list_entries', 'list_entries table exists');
select has_table('public', 'workspace_invitations', 'workspace_invitations table exists');
select has_table('public', 'profiles', 'profiles table exists');

select ok((select relrowsecurity from pg_class where oid = 'public.workspaces'::regclass), 'RLS enabled on workspaces');
select ok((select relrowsecurity from pg_class where oid = 'public.workspace_members'::regclass), 'RLS enabled on workspace_members');
select ok((select relrowsecurity from pg_class where oid = 'public.lists'::regclass), 'RLS enabled on lists');
select ok((select relrowsecurity from pg_class where oid = 'public.list_entries'::regclass), 'RLS enabled on list_entries');
select ok((select relrowsecurity from pg_class where oid = 'public.workspace_invitations'::regclass), 'RLS enabled on workspace_invitations');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS enabled on profiles');

select ok(has_function_privilege('authenticated', 'private.is_workspace_member(uuid)', 'EXECUTE'), 'authenticated can call the RLS membership helper');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'UPDATE'), 'members cannot directly update membership roles');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'INSERT'), 'members cannot bypass invitation acceptance');
select ok(not has_table_privilege('authenticated', 'public.workspace_members', 'DELETE'), 'members cannot directly delete memberships');
select ok(has_function_privilege('authenticated', 'public.accept_workspace_invitation(text)', 'EXECUTE'), 'authenticated users can accept invitations through the checked RPC');
select ok(not has_function_privilege('anon', 'public.accept_workspace_invitation(text)', 'EXECUTE'), 'anonymous users cannot accept invitations');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'INSERT'), 'profiles are created by the trusted auth trigger');
select ok(has_function_privilege('authenticated', 'private.can_view_profile(uuid)', 'EXECUTE'), 'authenticated can use shared-profile visibility checks');
select ok(has_function_privilege('authenticated', 'public.change_workspace_member_role(uuid,uuid,public.workspace_role)', 'EXECUTE'), 'authenticated role changes go through the checked owner RPC');
select ok(has_function_privilege('authenticated', 'public.remove_workspace_member(uuid,uuid)', 'EXECUTE'), 'authenticated member removal goes through the checked RPC');
select ok(not has_function_privilege('anon', 'public.remove_workspace_member(uuid,uuid)', 'EXECUTE'), 'anonymous users cannot remove workspace members');

select * from finish();
rollback;