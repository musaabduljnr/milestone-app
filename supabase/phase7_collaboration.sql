-- Phase 7 Collaboration: Messages extension and Notifications

-- 1. Extend public.messages with milestone_id and read_at
alter table public.messages add column if not exists milestone_id uuid references public.milestones(id) on delete cascade;
alter table public.messages add column if not exists read_at timestamp with time zone;

create index if not exists idx_messages_milestone_id on public.messages(milestone_id);

-- 2. Create public.notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null, -- e.g., 'PROJECT_ASSIGNMENT', 'MILESTONE_STARTED', 'MILESTONE_SUBMITTED', 'MILESTONE_APPROVED', 'PAYMENT_RELEASED', 'DISPUTE_OPENED', 'VERIFICATION_CHANGE', 'NEW_MESSAGE', 'DEADLINE_APPROACHING', 'AUTO_RELEASE_APPROACHING'
  title text not null,
  message text not null,
  project_id uuid references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete cascade,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for notifications performance
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_project_id on public.notifications(project_id);
create index if not exists idx_notifications_milestone_id on public.notifications(milestone_id);
create index if not exists idx_notifications_read_at on public.notifications(read_at);

-- Enable RLS
alter table public.notifications enable row level security;

-- Drop existing policies if they exist (just in case they are re-run)
drop policy if exists "Allow select own notifications" on public.notifications;
drop policy if exists "Allow update own notifications" on public.notifications;
drop policy if exists "Allow insert notifications for project participants or self" on public.notifications;

-- RLS Policies for Notifications
create policy "Allow select own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Allow update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Allow insert notifications for project participants or self"
  on public.notifications for insert
  with check (
    auth.uid() = user_id or
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.client_id = auth.uid()
    ) or
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_id and pm.user_id = auth.uid()
    )
  );
