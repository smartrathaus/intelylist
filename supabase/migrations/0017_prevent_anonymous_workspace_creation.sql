-- Anonymous sessions are intended only for scoped QR guest access, not workspace ownership.
drop policy if exists "users create own workspaces" on public.workspaces;
create policy "permanent users create own workspaces" on public.workspaces
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false
);
