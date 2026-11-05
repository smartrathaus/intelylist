-- Anonymous Supabase Auth users use the authenticated database role after sign-in.
-- The anon database role must not access guest invite, membership, or shopping history tables directly.
revoke all privileges on table public.list_guest_invites from anon, public;
revoke all privileges on table public.list_guest_members from anon, public;
revoke all privileges on table public.shopping_order_history from anon, public;
