-- Tighten policy shape and index all newly introduced foreign keys.
create index if not exists list_templates_workspace_id_idx on public.list_templates(workspace_id);
create index if not exists list_templates_created_by_idx on public.list_templates(created_by);
create index if not exists recurring_tasks_created_by_idx on public.recurring_tasks(created_by);
create index if not exists recurring_tasks_list_id_idx on public.recurring_tasks(list_id);
create index if not exists user_item_preferences_workspace_id_idx on public.user_item_preferences(workspace_id);
create index if not exists user_notifications_entry_id_idx on public.user_notifications(entry_id);
create index if not exists user_notifications_workspace_id_idx on public.user_notifications(workspace_id);

drop policy if exists "members manage recurring tasks" on public.recurring_tasks;
create policy "members create recurring tasks" on public.recurring_tasks for insert to authenticated
with check (created_by=(select auth.uid()) and exists(select 1 from public.lists l where l.id=list_id and private.is_workspace_member(l.workspace_id)));
create policy "authors update recurring tasks" on public.recurring_tasks for update to authenticated
using (created_by=(select auth.uid()) and exists(select 1 from public.lists l where l.id=list_id and private.is_workspace_member(l.workspace_id)))
with check (created_by=(select auth.uid()) and exists(select 1 from public.lists l where l.id=list_id and private.is_workspace_member(l.workspace_id)));
create policy "authors delete recurring tasks" on public.recurring_tasks for delete to authenticated
using (created_by=(select auth.uid()) and exists(select 1 from public.lists l where l.id=list_id and private.is_workspace_member(l.workspace_id)));

drop policy if exists "users manage own notifications" on public.user_notifications;
create policy "users create own notifications" on public.user_notifications for insert to authenticated
with check (user_id=(select auth.uid()) and private.is_workspace_member(workspace_id));
create policy "users update own notifications" on public.user_notifications for update to authenticated
using (user_id=(select auth.uid()) and private.is_workspace_member(workspace_id))
with check (user_id=(select auth.uid()) and private.is_workspace_member(workspace_id));
create policy "users delete own notifications" on public.user_notifications for delete to authenticated
using (user_id=(select auth.uid()) and private.is_workspace_member(workspace_id));