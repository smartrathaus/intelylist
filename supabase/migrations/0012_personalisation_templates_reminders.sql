-- Personalisation, reusable items, templates, recurrence and in-app reminders.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'fresh-mint' check (theme in ('fresh-mint','ocean-blue','soft-lavender','warm-sand','graphite','custom')),
  color_mode text not null default 'system' check (color_mode in ('light','dark','system')),
  accent_color text check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  browser_notifications boolean not null default false,
  reminder_lead_minutes integer not null default 15 check (reminder_lead_minutes between 0 and 10080),
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
create policy "users manage own preferences" on public.user_preferences
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.user_preferences to authenticated;

create table if not exists public.user_item_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  normalized_title text not null check (char_length(normalized_title) between 1 and 240),
  display_title text not null check (char_length(display_title) between 1 and 240),
  is_favorite boolean not null default false,
  last_used_at timestamptz not null default now(),
  use_count integer not null default 1 check (use_count > 0),
  primary key (user_id, workspace_id, normalized_title)
);
create index if not exists user_item_preferences_recent_idx on public.user_item_preferences(user_id, workspace_id, last_used_at desc);
alter table public.user_item_preferences enable row level security;
create policy "users manage own item preferences" on public.user_item_preferences
for all to authenticated using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
grant select, insert, update, delete on public.user_item_preferences to authenticated;

create table if not exists public.list_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  kind public.list_kind not null,
  entries jsonb not null default '[]'::jsonb check (jsonb_typeof(entries) = 'array' and jsonb_array_length(entries) <= 200),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.list_templates enable row level security;
create policy "members read templates" on public.list_templates for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy "members create templates" on public.list_templates for insert to authenticated
with check (created_by = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "authors or admins delete templates" on public.list_templates for delete to authenticated
using (created_by = (select auth.uid()) or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
grant select, insert, delete on public.list_templates to authenticated;

create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  source_entry_id uuid not null references public.list_entries(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  frequency text not null check (frequency in ('daily','weekly','monthly','yearly')),
  interval_count integer not null default 1 check (interval_count between 1 and 365),
  next_due_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(source_entry_id)
);
alter table public.recurring_tasks enable row level security;
create policy "members read recurring tasks" on public.recurring_tasks for select to authenticated
using (exists (select 1 from public.lists l where l.id=list_id and public.is_workspace_member(l.workspace_id)));
create policy "members manage recurring tasks" on public.recurring_tasks for all to authenticated
using (created_by = (select auth.uid()) and exists (select 1 from public.lists l where l.id=list_id and public.is_workspace_member(l.workspace_id)))
with check (created_by = (select auth.uid()) and exists (select 1 from public.lists l where l.id=list_id and public.is_workspace_member(l.workspace_id)));
grant select, insert, update, delete on public.recurring_tasks to authenticated;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entry_id uuid references public.list_entries(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text,
  remind_at timestamptz not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_due_idx on public.user_notifications(user_id, remind_at) where read_at is null;
alter table public.user_notifications enable row level security;
create policy "users read own notifications" on public.user_notifications for select to authenticated
using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "users manage own notifications" on public.user_notifications for all to authenticated
using (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id))
with check (user_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
grant select, insert, update, delete on public.user_notifications to authenticated;
