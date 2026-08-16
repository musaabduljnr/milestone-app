-- Milestone Escrow-Backed Project Management Platform
-- Initial Database Schema & RLS Policies (Phase 2 Foundation)

-- Create custom schema types & triggers first
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert into public.profiles
  insert into public.profiles (id, full_name, avatar_url, role, verification_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    null, -- Role must be explicitly selected on the selection screen later
    'pending'
  );

  -- Initialize a simulated wallet for the user
  insert into public.wallets (user_id, available_balance, pending_balance)
  values (
    new.id,
    0.00,
    0.00
  );

  return new;
end;
$$ language plpgsql security definer;

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  avatar_url text,
  role text check (role in ('client', 'freelancer')),
  verification_status text check (verification_status in ('pending', 'verified')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to automatically create a profile and wallet on auth signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Projects Table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text,
  budget numeric(12, 2) not null check (budget >= 0),
  currency text default 'USD' not null,
  status text check (status in ('draft', 'in_progress', 'completed', 'disputed')) default 'draft' not null,
  expected_completion date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Project Members (Authorization bridge mapping users to projects)
create table public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('client', 'freelancer')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (project_id, user_id)
);

-- 4. Milestones Table (Milestone timeline and payouts engine)
create table public.milestones (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  assigned_freelancer_id uuid references public.profiles(id) on delete set null,
  payout_amount numeric(12, 2) not null check (payout_amount >= 0),
  deadline timestamp with time zone,
  status text check (status in ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'PAID', 'DISPUTED')) default 'NOT_STARTED' not null,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Wallets Table (Simulated wallet ledger balances)
create table public.wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  available_balance numeric(12, 2) default 0.00 not null check (available_balance >= 0),
  pending_balance numeric(12, 2) default 0.00 not null check (pending_balance >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Escrow Ledger (Audit records tracking financial events)
create table public.escrow_ledger (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  milestone_id uuid references public.milestones(id) on delete cascade not null,
  amount numeric(12, 2) not null,
  entry_type text check (entry_type in ('FUNDED', 'HELD', 'RELEASED')) not null,
  status text check (status in ('completed', 'secured', 'processing', 'failed')) default 'processing' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Messages Table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Attachments Table
create table public.attachments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  milestone_id uuid references public.milestones(id) on delete cascade,
  uploader_id uuid references public.profiles(id) on delete cascade not null,
  filename text not null,
  storage_path text not null,
  content_type text not null,
  size integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Disputes Table
create table public.disputes (
  id uuid default gen_random_uuid() primary key,
  milestone_id uuid references public.milestones(id) on delete cascade unique not null,
  opened_by uuid references public.profiles(id) on delete cascade not null,
  reason text not null,
  description text,
  status text check (status in ('OPEN', 'RESOLVED')) default 'OPEN' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone
);

-- 10. Project Invitations Table (Phase 10A)
create table if not exists public.project_invitations (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  milestone_id uuid references public.milestones(id) on delete cascade not null,
  invited_by uuid references public.profiles(id) on delete cascade not null,
  invitee_email text not null,
  invitee_user_id uuid references public.profiles(id) on delete set null,
  status text check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')) default 'PENDING' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  responded_at timestamp with time zone,
  expires_at timestamp with time zone
);

-- CREATE INDEXES ON FOREIGN KEYS FOR OPTIMAL QUERYING PERFORMANCE
create index idx_projects_client_id on public.projects(client_id);
create index idx_project_members_project_id on public.project_members(project_id);
create index idx_project_members_user_id on public.project_members(user_id);
create index idx_milestones_project_id on public.milestones(project_id);
create index idx_milestones_assigned_freelancer_id on public.milestones(assigned_freelancer_id);
create index idx_escrow_ledger_project_id on public.escrow_ledger(project_id);
create index idx_escrow_ledger_milestone_id on public.escrow_ledger(milestone_id);
create index idx_messages_project_id on public.messages(project_id);
create index idx_messages_sender_id on public.messages(sender_id);
create index idx_attachments_project_id on public.attachments(project_id);
create index idx_attachments_milestone_id on public.attachments(milestone_id);
create index idx_disputes_milestone_id on public.disputes(milestone_id);
create index idx_project_invitations_project_id on public.project_invitations(project_id);
create index idx_project_invitations_milestone_id on public.project_invitations(milestone_id);
create index idx_project_invitations_invited_by on public.project_invitations(invited_by);
create index idx_project_invitations_invitee_email on public.project_invitations(lower(invitee_email));
create index idx_project_invitations_invitee_user_id on public.project_invitations(invitee_user_id);
create index idx_project_invitations_status on public.project_invitations(status);

-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.milestones enable row level security;
alter table public.wallets enable row level security;
alter table public.escrow_ledger enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.disputes enable row level security;
alter table public.project_invitations enable row level security;

-- Row Level Security (RLS) Policies

-- 1. Profiles Policies
create policy "Allow profile read if own or authenticated"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Allow own profile update"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Projects Policies
create policy "Allow select projects owned or joined"
  on public.projects for select
  using (
    auth.uid() = client_id or
    exists (
      select 1 from public.project_members pm 
      where pm.project_id = id and pm.user_id = auth.uid()
    )
  );

create policy "Allow clients to create projects"
  on public.projects for insert
  with check (
    auth.uid() = client_id and
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'client'
    )
  );

create policy "Allow owners to update projects"
  on public.projects for update
  using (auth.uid() = client_id);

create policy "Allow owners to delete projects"
  on public.projects for delete
  using (auth.uid() = client_id);

-- 3. Project Members Policies
create policy "Allow members select membership info"
  on public.project_members for select
  using (
    exists (
      select 1 from public.projects p 
      where p.id = project_id and p.client_id = auth.uid()
    ) or
    exists (
      select 1 from public.project_members pm 
      where pm.project_id = project_id and pm.user_id = auth.uid()
    )
  );

create policy "Allow project owners to invite/remove members"
  on public.project_members for all
  using (
    exists (
      select 1 from public.projects p 
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

-- 4. Milestones Policies
create policy "Allow milestoness select for project participants"
  on public.milestones for select
  using (
    assigned_freelancer_id = auth.uid() or
    exists (
      select 1 from public.projects p 
      where p.id = project_id and p.client_id = auth.uid()
    ) or
    exists (
      select 1 from public.project_members pm 
      where pm.project_id = project_id and pm.user_id = auth.uid()
    )
  );

create policy "Allow owners to manage milestones"
  on public.milestones for all
  using (
    exists (
      select 1 from public.projects p 
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

-- 5. Wallets Policies
create policy "Allow select own wallet"
  on public.wallets for select
  using (auth.uid() = user_id);

-- 6. Escrow Ledger Policies
create policy "Allow select ledger for project participants"
  on public.escrow_ledger for select
  using (
    exists (
      select 1 from public.projects p 
      where p.id = project_id and p.client_id = auth.uid()
    ) or
    exists (
      select 1 from public.project_members pm 
      where pm.project_id = project_id and pm.user_id = auth.uid()
    )
  );

-- 7. Messages Policies
create policy "Allow messages CRUD for project participants"
  on public.messages for all
  using (
    exists (
      select 1 from public.projects p 
      where p.id = project_id and p.client_id = auth.uid()
    ) or
    exists (
      select 1 from public.project_members pm 
      where pm.project_id = project_id and pm.user_id = auth.uid()
    )
  );

-- 8. Attachments Policies
create policy "Allow attachments CRUD for project participants"
  on public.attachments for all
  using (
    exists (
      select 1 from public.projects p 
      where p.id = project_id and p.client_id = auth.uid()
    ) or
    exists (
      select 1 from public.project_members pm 
      where pm.project_id = project_id and pm.user_id = auth.uid()
    )
  );

-- 9. Disputes Policies
create policy "Allow disputes CRUD for project participants"
  on public.disputes for all
  using (
    exists (
      select 1 from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = milestone_id and (
        p.client_id = auth.uid() or
        m.assigned_freelancer_id = auth.uid() or
        exists (
          select 1 from public.project_members pm 
          where pm.project_id = p.id and pm.user_id = auth.uid()
        )
      )
    )
  );

-- 10. Project Invitations Policies
create policy "Allow select invitations for participants"
  on public.project_invitations for select
  using (
    invited_by = auth.uid() or
    invitee_user_id = auth.uid() or
    lower(invitee_email) = lower(auth.jwt()->>'email') or
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

create policy "Allow insert invitations for project client"
  on public.project_invitations for insert
  with check (
    invited_by = auth.uid() and
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

create policy "Allow update invitations for participants"
  on public.project_invitations for update
  using (
    invited_by = auth.uid() or
    invitee_user_id = auth.uid() or
    lower(invitee_email) = lower(auth.jwt()->>'email')
  );

-- Safe Freelancer Lookup RPC
create or replace function public.lookup_freelancer_by_email(p_email text)
returns jsonb as $$
declare
  v_email text;
  v_profile record;
begin
  v_email := lower(trim(p_email));
  if v_email is null or v_email = '' then
    return jsonb_build_object('exists', false);
  end if;

  select id, full_name, avatar_url, role, verification_status, email into v_profile
  from public.profiles
  where (lower(email) = v_email or id in (
    select id from auth.users where lower(email) = v_email
  )) and role = 'freelancer'
  limit 1;

  if not found then
    return jsonb_build_object('exists', false);
  end if;

  return jsonb_build_object(
    'exists', true,
    'id', v_profile.id,
    'full_name', v_profile.full_name,
    'avatar_url', v_profile.avatar_url,
    'verification_status', v_profile.verification_status,
    'email', coalesce(v_profile.email, v_email)
  );
end;
$$ language plpgsql security definer;

-- Transaction RPC: create project and milestones atomically with invitations
create or replace function public.create_project_with_milestones(
  p_title text,
  p_description text,
  p_category text,
  p_budget numeric,
  p_currency text,
  p_expected_completion date,
  p_milestones jsonb
) returns uuid as $$
declare
  v_project_id uuid;
  v_client_id uuid;
  v_client_name text;
  v_milestone jsonb;
  v_milestone_id uuid;
  v_invitee_email text;
  v_freelancer_id uuid;
  v_invitation_id uuid;
  v_milestone_title text;
  v_payout_amount numeric;
begin
  -- 1. Authenticate user
  v_client_id := auth.uid();
  if v_client_id is null then
    raise exception 'Unauthenticated request. Please sign in.';
  end if;

  -- 2. Validate client role & fetch client name
  select full_name into v_client_name
  from public.profiles
  where id = v_client_id and role = 'client';

  if not found then
    raise exception 'Unauthorized: Only clients can create projects.';
  end if;

  if v_client_name is null or v_client_name = '' then
    v_client_name := 'Project Client';
  end if;

  -- 3. Validate project basics
  if p_title is null or trim(p_title) = '' then
    raise exception 'Project title is required.';
  end if;
  if p_description is null or trim(p_description) = '' then
    raise exception 'Project description is required.';
  end if;
  if p_category is null or trim(p_category) = '' then
    raise exception 'Project category is required.';
  end if;
  if p_budget is null or p_budget <= 0 then
    raise exception 'Project budget must be greater than 0.';
  end if;
  if p_expected_completion is null then
    raise exception 'Expected completion date is required.';
  end if;

  -- 4. Validate milestones array
  if p_milestones is null or jsonb_array_length(p_milestones) < 2 or jsonb_array_length(p_milestones) > 6 then
    raise exception 'Projects must contain between 2 and 6 milestones.';
  end if;

  -- 5. Insert project row in 'draft' status
  insert into public.projects (
    client_id, title, description, category, budget, currency, status, expected_completion
  ) values (
    v_client_id, trim(p_title), trim(p_description), trim(p_category), p_budget, coalesce(p_currency, 'USD'), 'draft', p_expected_completion
  ) returning id into v_project_id;

  -- 6. Insert client membership
  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_client_id, 'client');

  -- 7. Loop through milestones
  for v_milestone in select * from jsonb_array_elements(p_milestones) loop
    v_milestone_title := trim(v_milestone->>'title');
    v_payout_amount := (v_milestone->>'payout_amount')::numeric;

    if v_milestone_title is null or v_milestone_title = '' then
      raise exception 'All milestones must have a title.';
    end if;
    if v_payout_amount is null or v_payout_amount <= 0 then
      raise exception 'Milestone payout amounts must be greater than 0.';
    end if;

    -- Insert milestone with unassigned status (freelancer must explicitly accept first!)
    insert into public.milestones (
      project_id, title, description, assigned_freelancer_id, payout_amount, deadline, status
    ) values (
      v_project_id,
      v_milestone_title,
      trim(coalesce(v_milestone->>'description', '')),
      null,
      v_payout_amount,
      (v_milestone->>'deadline')::timestamp with time zone,
      'NOT_STARTED'
    ) returning id into v_milestone_id;

    -- Check if a freelancer email was assigned for invitation
    v_invitee_email := lower(trim(coalesce(v_milestone->>'assigned_freelancer_email', v_milestone->>'invitee_email', '')));
    
    if v_invitee_email <> '' then
      -- Resolve freelancer profile
      v_freelancer_id := null;
      select id into v_freelancer_id
      from public.profiles
      where (lower(email) = v_invitee_email or id in (
        select id from auth.users where lower(email) = v_invitee_email
      )) and role = 'freelancer'
      limit 1;

      -- Create pending invitation record
      insert into public.project_invitations (
        project_id, milestone_id, invited_by, invitee_email, invitee_user_id, status
      ) values (
        v_project_id, v_milestone_id, v_client_id, v_invitee_email, v_freelancer_id, 'PENDING'
      ) returning id into v_invitation_id;

      -- If registered freelancer account exists, send in-app notification
      if v_freelancer_id is not null then
        insert into public.notifications (
          user_id, type, title, message, project_id, milestone_id
        ) values (
          v_freelancer_id,
          'PROJECT_INVITATION',
          'Project Invitation',
          v_client_name || ' invited you to work on: ' || v_milestone_title || ' in project "' || p_title || '" (Payout: ' || coalesce(p_currency, 'USD') || ' ' || v_payout_amount::text || ').',
          v_project_id,
          v_milestone_id
        );
      end if;
    end if;
  end loop;

  return v_project_id;
end;
$$ language plpgsql security definer;

-- Accept Invitation RPC
create or replace function public.accept_invitation(p_invitation_id uuid)
returns jsonb as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_user_name text;
  v_invitation record;
  v_milestone record;
  v_project record;
begin
  -- 1. Authenticate user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthenticated request. Please sign in.';
  end if;

  -- 2. Verify freelancer role
  select full_name, email into v_user_name, v_user_email
  from public.profiles
  where id = v_user_id and role = 'freelancer';

  if not found then
    raise exception 'Unauthorized: Only registered freelancers can accept invitations.';
  end if;

  if v_user_name is null or v_user_name = '' then
    v_user_name := 'Freelancer';
  end if;

  if v_user_email is null or v_user_email = '' then
    v_user_email := lower(auth.jwt()->>'email');
  end if;

  -- 3. Lock invitation row
  select * into v_invitation
  from public.project_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found.';
  end if;

  -- 4. Verify invitation belongs to this freelancer
  if v_invitation.invitee_user_id is not null and v_invitation.invitee_user_id <> v_user_id then
    raise exception 'Unauthorized: This invitation was sent to a different account.';
  end if;

  if v_invitation.invitee_user_id is null and lower(v_invitation.invitee_email) <> lower(v_user_email) then
    raise exception 'Unauthorized: This invitation was addressed to % but your account email is %.', v_invitation.invitee_email, v_user_email;
  end if;

  -- 5. Verify invitation is pending
  if v_invitation.status <> 'PENDING' then
    raise exception 'Invitation is no longer pending (current status: %).', v_invitation.status;
  end if;

  -- 6. Verify project & milestone exist
  select * into v_milestone from public.milestones where id = v_invitation.milestone_id;
  if not found then
    raise exception 'Associated milestone no longer exists.';
  end if;

  select * into v_project from public.projects where id = v_invitation.project_id;
  if not found then
    raise exception 'Associated project no longer exists.';
  end if;

  -- 7. Update invitation status atomically
  update public.project_invitations
  set status = 'ACCEPTED',
      invitee_user_id = v_user_id,
      responded_at = timezone('utc'::text, now())
  where id = p_invitation_id;

  -- 8. Add freelancer to project_members (idempotent)
  insert into public.project_members (project_id, user_id, role)
  values (v_invitation.project_id, v_user_id, 'freelancer')
  on conflict (project_id, user_id) do nothing;

  -- 9. Assign freelancer to the milestone
  update public.milestones
  set assigned_freelancer_id = v_user_id,
      updated_at = timezone('utc'::text, now())
  where id = v_invitation.milestone_id;

  -- 10. Send notification to the project client owner
  insert into public.notifications (
    user_id, type, title, message, project_id, milestone_id
  ) values (
    v_project.client_id,
    'INVITATION_ACCEPTED',
    'Invitation Accepted',
    v_user_name || ' accepted your invitation for: ' || v_milestone.title || ' in project "' || v_project.title || '".',
    v_invitation.project_id,
    v_invitation.milestone_id
  );

  return jsonb_build_object(
    'success', true,
    'project_id', v_invitation.project_id,
    'milestone_id', v_invitation.milestone_id
  );
end;
$$ language plpgsql security definer;

-- Decline Invitation RPC
create or replace function public.decline_invitation(p_invitation_id uuid)
returns jsonb as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_user_name text;
  v_invitation record;
  v_milestone record;
  v_project record;
begin
  -- 1. Authenticate user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthenticated request. Please sign in.';
  end if;

  -- 2. Fetch user profile
  select full_name, email into v_user_name, v_user_email
  from public.profiles
  where id = v_user_id;

  if v_user_name is null or v_user_name = '' then
    v_user_name := 'Freelancer';
  end if;

  if v_user_email is null or v_user_email = '' then
    v_user_email := lower(auth.jwt()->>'email');
  end if;

  -- 3. Lock invitation row
  select * into v_invitation
  from public.project_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found.';
  end if;

  -- 4. Verify invitation belongs to this user
  if v_invitation.invitee_user_id is not null and v_invitation.invitee_user_id <> v_user_id then
    raise exception 'Unauthorized: This invitation was sent to a different account.';
  end if;

  if v_invitation.invitee_user_id is null and lower(v_invitation.invitee_email) <> lower(v_user_email) then
    raise exception 'Unauthorized: This invitation was addressed to %.', v_invitation.invitee_email;
  end if;

  -- 5. Verify status is pending
  if v_invitation.status <> 'PENDING' then
    raise exception 'Invitation is no longer pending (current status: %).', v_invitation.status;
  end if;

  -- 6. Fetch project & milestone for notification context
  select * into v_milestone from public.milestones where id = v_invitation.milestone_id;
  select * into v_project from public.projects where id = v_invitation.project_id;

  -- 7. Update status to DECLINED
  update public.project_invitations
  set status = 'DECLINED',
      invitee_user_id = coalesce(invitee_user_id, v_user_id),
      responded_at = timezone('utc'::text, now())
  where id = p_invitation_id;

  -- 8. Notify the client owner
  if v_project.client_id is not null then
    insert into public.notifications (
      user_id, type, title, message, project_id, milestone_id
    ) values (
      v_project.client_id,
      'INVITATION_DECLINED',
      'Invitation Declined',
      v_user_name || ' declined the invitation for: ' || coalesce(v_milestone.title, 'Milestone') || ' in project "' || coalesce(v_project.title, 'Project') || '".',
      v_invitation.project_id,
      v_invitation.milestone_id
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'project_id', v_invitation.project_id,
    'milestone_id', v_invitation.milestone_id
  );
end;
$$ language plpgsql security definer;

-- Client Invite / Re-invite Freelancer to Milestone RPC
create or replace function public.invite_freelancer_to_milestone(
  p_milestone_id uuid,
  p_email text
) returns jsonb as $$
declare
  v_client_id uuid;
  v_client_name text;
  v_milestone record;
  v_project record;
  v_email text;
  v_freelancer_id uuid;
  v_invitation_id uuid;
begin
  -- 1. Authenticate user
  v_client_id := auth.uid();
  if v_client_id is null then
    raise exception 'Unauthenticated request. Please sign in.';
  end if;

  -- 2. Fetch milestone & project
  select * into v_milestone from public.milestones where id = p_milestone_id;
  if not found then
    raise exception 'Milestone not found.';
  end if;

  select * into v_project from public.projects where id = v_milestone.project_id;
  if not found then
    raise exception 'Project not found.';
  end if;

  -- 3. Verify client owns project
  if v_project.client_id <> v_client_id then
    raise exception 'Unauthorized: Only the project owner can invite freelancers.';
  end if;

  -- 4. Check milestone state machine: cannot reassign if milestone is completed/paid
  if v_milestone.status in ('APPROVED', 'PAID') then
    raise exception 'Cannot assign freelancers to completed or paid milestones.';
  end if;

  -- 5. Normalize email & resolve freelancer account
  v_email := lower(trim(p_email));
  if v_email is null or v_email = '' then
    raise exception 'A valid freelancer email is required.';
  end if;

  select id into v_freelancer_id
  from public.profiles
  where (lower(email) = v_email or id in (
    select id from auth.users where lower(email) = v_email
  )) and role = 'freelancer'
  limit 1;

  if v_freelancer_id is null then
    raise exception 'No Milestone freelancer account was found for this email.';
  end if;

  select full_name into v_client_name from public.profiles where id = v_client_id;
  if v_client_name is null or v_client_name = '' then
    v_client_name := 'Project Client';
  end if;

  -- 6. Cancel any existing pending invitations for this milestone
  update public.project_invitations
  set status = 'CANCELLED',
      responded_at = timezone('utc'::text, now())
  where milestone_id = p_milestone_id and status = 'PENDING';

  -- 7. Insert new invitation
  insert into public.project_invitations (
    project_id, milestone_id, invited_by, invitee_email, invitee_user_id, status
  ) values (
    v_project.id, p_milestone_id, v_client_id, v_email, v_freelancer_id, 'PENDING'
  ) returning id into v_invitation_id;

  -- 8. Send notification to the freelancer
  insert into public.notifications (
    user_id, type, title, message, project_id, milestone_id
  ) values (
    v_freelancer_id,
    'PROJECT_INVITATION',
    'Project Invitation',
    v_client_name || ' invited you to work on: ' || v_milestone.title || ' in project "' || v_project.title || '" (Payout: ' || v_project.currency || ' ' || v_milestone.payout_amount::text || ').',
    v_project.id,
    p_milestone_id
  );

  return jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id
  );
end;
$$ language plpgsql security definer;

-- Transaction RPC: fund project atomically
create or replace function public.fund_project(p_project_id uuid)
returns void as $$
declare
  v_client_id uuid;
  v_budget numeric;
  v_status text;
  v_wallet_id uuid;
  v_balance numeric;
  v_milestone record;
begin
  -- 1. Resolve executor
  v_client_id := auth.uid();
  if v_client_id is null then
    raise exception 'Unauthenticated request';
  end if;

  -- 2. Lock the project row to prevent concurrent updates
  select client_id, budget, status into v_client_id, v_budget, v_status
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  -- 3. Validate ownership
  if v_client_id <> auth.uid() then
    raise exception 'Unauthorized: Only the project owner can fund the project';
  end if;

  -- 4. Check project status (must be draft to fund)
  if v_status <> 'draft' then
    raise exception 'Project is already funded or in progress';
  end if;

  -- 5. Lock client's wallet row to prevent concurrent balance spends
  select id, available_balance into v_wallet_id, v_balance
  from public.wallets
  where user_id = v_client_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  -- 6. Check available balance is sufficient
  if v_balance < v_budget then
    raise exception 'Insufficient wallet balance. Required: %, Available: %', v_budget, v_balance;
  end if;

  -- 7. Deduct from available, add to pending (held in escrow)
  update public.wallets
  set available_balance = available_balance - v_budget,
      pending_balance = pending_balance + v_budget,
      updated_at = now()
  where id = v_wallet_id;

  -- 8. Mark project status as 'in_progress' (funded)
  update public.projects
  set status = 'in_progress',
      updated_at = now()
  where id = p_project_id;

  -- 9. Create escrow ledger records for each milestone of the project
  for v_milestone in select id, payout_amount from public.milestones where project_id = p_project_id loop
    insert into public.escrow_ledger (project_id, milestone_id, amount, entry_type, status)
    values (p_project_id, v_milestone.id, v_milestone.payout_amount, 'HELD', 'secured');
  end loop;
end;
$$ language plpgsql security definer;

-- Dev RPC: Top up simulated wallet available balance
create or replace function public.add_simulated_funds(p_amount numeric)
returns void as $$
begin
  -- Check authentication
  if auth.uid() is null then
    raise exception 'Unauthenticated';
  end if;

  -- Check if client role is verified
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'client') then
    raise exception 'Unauthorized: Only clients can receive simulated funds';
  end if;

  update public.wallets
  set available_balance = available_balance + p_amount,
      updated_at = now()
  where user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- ====================================================================
-- PHASE 5A UPDATE: SIMULATED IDENTITY VERIFICATION FOUNDATION
-- ====================================================================

-- 1. Alter profiles table to add verification columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_id_path text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_started_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_verified_at timestamp with time zone;

-- 2. Create private storage bucket 'identity-documents'
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Security RLS Policies for identity-documents bucket
DROP POLICY IF EXISTS "Allow user select own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow user insert own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow user update own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow user delete own identity documents" ON storage.objects;

CREATE POLICY "Allow user select own identity documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'identity-documents' AND (regexp_split_to_array(name, '/'))[1] = auth.uid()::text);

CREATE POLICY "Allow user insert own identity documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'identity-documents' AND (regexp_split_to_array(name, '/'))[1] = auth.uid()::text);

CREATE POLICY "Allow user update own identity documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'identity-documents' AND (regexp_split_to_array(name, '/'))[1] = auth.uid()::text);

CREATE POLICY "Allow user delete own identity documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'identity-documents' AND (regexp_split_to_array(name, '/'))[1] = auth.uid()::text);

-- 4. Financial Access Control: Restrict fund_project to verified clients
CREATE OR REPLACE FUNCTION public.fund_project(p_project_id uuid)
RETURNS void AS $$
DECLARE
  v_client_id uuid;
  v_budget numeric;
  v_status text;
  v_wallet_id uuid;
  v_balance numeric;
  v_milestone record;
BEGIN
  -- 1. Resolve executor
  v_client_id := auth.uid();
  if v_client_id is null then
    raise exception 'Unauthenticated request';
  end if;

  -- Verify client verification status
  if not exists (
    select 1 from public.profiles 
    where id = v_client_id and role = 'client' and verification_status = 'verified'
  ) then
    raise exception 'Unauthorized: Only verified clients can fund projects';
  end if;

  -- 2. Lock the project row to prevent concurrent updates
  select client_id, budget, status into v_client_id, v_budget, v_status
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  -- 3. Validate ownership
  if v_client_id <> auth.uid() then
    raise exception 'Unauthorized: Only the project owner can fund the project';
  end if;

  -- 4. Check project status (must be draft to fund)
  if v_status <> 'draft' then
    raise exception 'Project is already funded or in progress';
  end if;

  -- 5. Lock client's wallet row to prevent concurrent balance spends
  select id, available_balance into v_wallet_id, v_balance
  from public.wallets
  where user_id = v_client_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  -- 6. Check available balance is sufficient
  if v_balance < v_budget then
    raise exception 'Insufficient wallet balance. Required: %, Available: %', v_budget, v_balance;
  end if;

  -- 7. Deduct from available, add to pending (held in escrow)
  update public.wallets
  set available_balance = available_balance - v_budget,
      pending_balance = pending_balance + v_budget,
      updated_at = now()
  where id = v_wallet_id;

  -- 8. Mark project status as 'in_progress' (funded)
  update public.projects
  set status = 'in_progress',
      updated_at = now()
  where id = p_project_id;

  -- 9. Create escrow ledger records for each milestone of the project
  for v_milestone in select id, payout_amount from public.milestones where project_id = p_project_id loop
    insert into public.escrow_ledger (project_id, milestone_id, amount, entry_type, status)
    values (p_project_id, v_milestone.id, v_milestone.payout_amount, 'HELD', 'secured');
  end loop;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Financial Access Control: Restrict start_milestone to verified freelancers
CREATE OR REPLACE FUNCTION public.start_milestone(p_milestone_id uuid)
RETURNS void AS $$
DECLARE
  v_milestone record;
BEGIN
  -- Select and lock milestone row
  SELECT * INTO v_milestone
  FROM public.milestones
  WHERE id = p_milestone_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  -- Verify client is not calling freelancer action and auth belongs to assignee
  IF auth.uid() IS NULL OR auth.uid() <> v_milestone.assigned_freelancer_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the assigned freelancer can start this milestone';
  END IF;

  -- Verify freelancer verification status
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'freelancer' AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only verified freelancers can start milestones';
  END IF;

  -- Validate transition NOT_STARTED -> IN_PROGRESS
  IF v_milestone.status <> 'NOT_STARTED' THEN
    RAISE EXCEPTION 'Invalid transition: Milestone must be in NOT_STARTED status. Current: %', v_milestone.status;
  END IF;

  -- Perform update
  UPDATE public.milestones
  SET status = 'IN_PROGRESS',
      updated_at = now()
  WHERE id = p_milestone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Financial Access Control: Restrict submit_milestone to verified freelancers
CREATE OR REPLACE FUNCTION public.submit_milestone(
  p_milestone_id uuid,
  p_description text
)
RETURNS void AS $$
DECLARE
  v_milestone record;
BEGIN
  -- Select and lock milestone row
  SELECT * INTO v_milestone
  FROM public.milestones
  WHERE id = p_milestone_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  -- Verify caller is the assigned freelancer
  IF auth.uid() IS NULL OR auth.uid() <> v_milestone.assigned_freelancer_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the assigned freelancer can submit work';
  END IF;

  -- Verify freelancer verification status
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'freelancer' AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only verified freelancers can submit work';
  END IF;

  -- Validate state is IN_PROGRESS
  IF v_milestone.status <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Invalid transition: Milestone must be in IN_PROGRESS status. Current: %', v_milestone.status;
  END IF;

  -- Update status, description, and submitted timestamp
  UPDATE public.milestones
  SET status = 'SUBMITTED',
      submission_description = p_description,
      submitted_at = now(),
      updated_at = now()
  WHERE id = p_milestone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Verification Status Trigger: Prevent direct client updates setting status to verified
CREATE OR REPLACE FUNCTION public.protect_verification_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.verification_status = 'verified' AND OLD.verification_status <> 'verified' THEN
    -- Check if config app.performing_verification is set to true
    IF COALESCE(current_setting('app.performing_verification', true), '') <> 'true' THEN
      RAISE EXCEPTION 'Unauthorized: Cannot directly update verification status to verified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_verification_status_protection ON public.profiles;
CREATE TRIGGER enforce_verification_status_protection
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_verification_status();

-- 8. RPC: Start Mock Verification (eligibility check & set to pending)
CREATE OR REPLACE FUNCTION public.start_mock_verification()
RETURNS void AS $$
DECLARE
  v_uid uuid;
  v_profile record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.full_name IS NULL OR v_profile.full_name = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  IF v_profile.date_of_birth IS NULL THEN
    RAISE EXCEPTION 'Date of birth is required';
  END IF;

  IF v_profile.photo_id_path IS NULL OR v_profile.photo_id_path = '' THEN
    RAISE EXCEPTION 'Photo ID reference is required';
  END IF;

  -- Set status to pending
  UPDATE public.profiles
  SET verification_status = 'pending',
      verification_started_at = now(),
      updated_at = now()
  WHERE id = v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Complete Mock Verification (transition pending to verified)
CREATE OR REPLACE FUNCTION public.complete_mock_verification()
RETURNS void AS $$
DECLARE
  v_uid uuid;
  v_profile record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.verification_status <> 'pending' THEN
    RAISE EXCEPTION 'Verification is not pending';
  END IF;

  -- Set config session variable to allow transition
  PERFORM set_config('app.performing_verification', 'true', true);

  UPDATE public.profiles
  SET verification_status = 'verified',
      verification_verified_at = now(),
      updated_at = now()
  WHERE id = v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: Release Milestone Payment (Manual Approval or Auto-Release)
CREATE OR REPLACE FUNCTION public.release_milestone_payment(
  p_milestone_id uuid,
  p_is_auto_release boolean DEFAULT false
)
RETURNS void AS $$
DECLARE
  v_milestone record;
  v_project record;
  v_client_wallet record;
  v_freelancer_wallet record;
  v_client_id uuid;
  v_freelancer_id uuid;
  v_amount numeric;
  v_target_status text;
BEGIN
  -- 1. Lock the milestone row to prevent concurrent updates
  SELECT * INTO v_milestone
  FROM public.milestones
  WHERE id = p_milestone_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  -- Idempotency check: if already paid or approved, return success immediately
  IF v_milestone.status IN ('PAID', 'APPROVED', 'AUTO_RELEASED') THEN
    RETURN;
  END IF;

  -- 2. Validate current status is SUBMITTED
  IF v_milestone.status <> 'SUBMITTED' THEN
    RAISE EXCEPTION 'Invalid transition: Milestone must be in SUBMITTED status. Current: %', v_milestone.status;
  END IF;

  -- Validate no open dispute exists
  IF EXISTS (
    SELECT 1 FROM public.disputes
    WHERE milestone_id = p_milestone_id AND status = 'OPEN'
  ) THEN
    RAISE EXCEPTION 'Cannot release payment: Milestone has an active open dispute';
  END IF;

  -- Fetch project details
  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_milestone.project_id;

  v_client_id := v_project.client_id;
  v_freelancer_id := v_milestone.assigned_freelancer_id;
  v_amount := v_milestone.payout_amount;

  IF v_freelancer_id IS NULL THEN
    RAISE EXCEPTION 'No freelancer assigned to this milestone';
  END IF;

  -- 3. Authorization validation
  IF p_is_auto_release THEN
    -- Verify caller is service_role or system
    IF auth.role() <> 'service_role' THEN
      RAISE EXCEPTION 'Unauthorized: Only system service role is permitted to trigger automatic release';
    END IF;
    v_target_status := 'AUTO_RELEASED';
  ELSE
    -- Verify manual approval is triggered by the project owner
    IF auth.uid() IS NULL OR auth.uid() <> v_client_id THEN
      RAISE EXCEPTION 'Unauthorized: Only the project owner can approve this milestone';
    END IF;
    -- Verify freelancer is not approving their own milestone
    IF auth.uid() = v_freelancer_id THEN
      RAISE EXCEPTION 'Unauthorized: Freelancer cannot approve their own milestone';
    END IF;
    v_target_status := 'APPROVED';
  END IF;

  -- 4. Lock client and freelancer wallets
  SELECT * INTO v_client_wallet
  FROM public.wallets
  WHERE user_id = v_client_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client wallet not found';
  END IF;

  SELECT * INTO v_freelancer_wallet
  FROM public.wallets
  WHERE user_id = v_freelancer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Freelancer wallet not found';
  END IF;

  -- 5. Validate client wallet has sufficient escrow held balance
  IF v_client_wallet.pending_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient escrow balance. Required: %, Available: %', v_amount, v_client_wallet.pending_balance;
  END IF;

  -- 6. Perform Transfers
  -- Deduct from client's pending (held in escrow) balance
  UPDATE public.wallets
  SET pending_balance = pending_balance - v_amount,
      updated_at = now()
  WHERE user_id = v_client_id;

  -- Add to freelancer's available balance
  UPDATE public.wallets
  SET available_balance = available_balance + v_amount,
      updated_at = now()
  WHERE user_id = v_freelancer_id;

  -- 7. Record Escrow Ledger audit entry
  INSERT INTO public.escrow_ledger (project_id, milestone_id, amount, entry_type, status)
  VALUES (v_project.id, p_milestone_id, v_amount, 'RELEASED', 'completed');

  -- 8. Change state to intermediate (APPROVED/AUTO_RELEASED)
  UPDATE public.milestones
  SET status = v_target_status,
      approved_at = now(),
      updated_at = now()
  WHERE id = p_milestone_id;

  -- 9. Transition immediately to PAID
  UPDATE public.milestones
  SET status = 'PAID',
      paid_at = now(),
      updated_at = now()
  WHERE id = p_milestone_id;

  -- 10. Automatically mark project as completed if all milestones are paid
  IF NOT EXISTS (
    SELECT 1 FROM public.milestones
    WHERE project_id = v_project.id AND status <> 'PAID'
  ) THEN
    UPDATE public.projects
    SET status = 'completed',
        updated_at = now()
    WHERE id = v_project.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Dispute Milestone
CREATE OR REPLACE FUNCTION public.dispute_milestone(
  p_milestone_id uuid,
  p_reason text,
  p_description text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_milestone record;
  v_project record;
  v_client_id uuid;
  v_freelancer_id uuid;
BEGIN
  -- Lock milestone row
  SELECT * INTO v_milestone
  FROM public.milestones
  WHERE id = p_milestone_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_milestone.project_id;

  v_client_id := v_project.client_id;
  v_freelancer_id := v_milestone.assigned_freelancer_id;

  -- Only project client or assigned freelancer can dispute
  IF auth.uid() IS NULL OR (auth.uid() <> v_client_id AND auth.uid() <> v_freelancer_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only project participants can open a dispute';
  END IF;

  -- Validate state: must be SUBMITTED
  IF v_milestone.status <> 'SUBMITTED' THEN
    RAISE EXCEPTION 'Invalid transition: Only SUBMITTED milestones can be disputed. Current: %', v_milestone.status;
  END IF;

  -- Update status to DISPUTED
  UPDATE public.milestones
  SET status = 'DISPUTED',
      updated_at = now()
  WHERE id = p_milestone_id;

  -- Insert record in disputes table
  INSERT INTO public.disputes (milestone_id, opened_by, reason, description, status)
  VALUES (p_milestone_id, auth.uid(), p_reason, p_description, 'OPEN')
  ON CONFLICT (milestone_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ====================================================================
-- PHASE 5A UPDATE: SIMULATED IDENTITY VERIFICATION FOUNDATION
-- ====================================================================

-- 1. Alter profiles table to add verification columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_id_path text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_started_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_verified_at timestamp with time zone;

-- 2. Create private storage bucket 'identity-documents'
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Security RLS Policies for identity-documents bucket
DROP POLICY IF EXISTS "Allow user select own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow user insert own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow user update own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow user delete own identity documents" ON storage.objects;

CREATE POLICY "Allow user select own identity documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'identity-documents' AND (regexp_split_to_array(name, '/'))[1] = auth.uid()::text);

CREATE POLICY "Allow user insert own identity documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'identity-documents' AND (regexp_split_to_array(name, '/'))[1] = auth.uid()::text);

CREATE POLICY "Allow user update own identity documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'identity-documents' AND (regexp_split_to_array(name, '/'))[1] = auth.uid()::text);

CREATE POLICY "Allow user delete own identity documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'identity-documents' AND (regexp_split_to_array(name, '/'))[1] = auth.uid()::text);

-- 4. Financial Access Control: Restrict fund_project to verified clients
CREATE OR REPLACE FUNCTION public.fund_project(p_project_id uuid)
RETURNS void AS $$
DECLARE
  v_client_id uuid;
  v_budget numeric;
  v_status text;
  v_wallet_id uuid;
  v_balance numeric;
  v_milestone record;
BEGIN
  -- 1. Resolve executor
  v_client_id := auth.uid();
  if v_client_id is null then
    raise exception 'Unauthenticated request';
  end if;

  -- Verify client verification status
  if not exists (
    select 1 from public.profiles 
    where id = v_client_id and role = 'client' and verification_status = 'verified'
  ) then
    raise exception 'Unauthorized: Only verified clients can fund projects';
  end if;

  -- 2. Lock the project row to prevent concurrent updates
  select client_id, budget, status into v_client_id, v_budget, v_status
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  -- 3. Validate ownership
  if v_client_id <> auth.uid() then
    raise exception 'Unauthorized: Only the project owner can fund the project';
  end if;

  -- 4. Check project status (must be draft to fund)
  if v_status <> 'draft' then
    raise exception 'Project is already funded or in progress';
  end if;

  -- 5. Lock client's wallet row to prevent concurrent balance spends
  select id, available_balance into v_wallet_id, v_balance
  from public.wallets
  where user_id = v_client_id
  for update;

  if not found then
    raise exception 'Wallet not found';
  end if;

  -- 6. Check available balance is sufficient
  if v_balance < v_budget then
    raise exception 'Insufficient wallet balance. Required: %, Available: %', v_budget, v_balance;
  end if;

  -- 7. Deduct from available, add to pending (held in escrow)
  update public.wallets
  set available_balance = available_balance - v_budget,
      pending_balance = pending_balance + v_budget,
      updated_at = now()
  where id = v_wallet_id;

  -- 8. Mark project status as 'in_progress' (funded)
  update public.projects
  set status = 'in_progress',
      updated_at = now()
  where id = p_project_id;

  -- 9. Create escrow ledger records for each milestone of the project
  for v_milestone in select id, payout_amount from public.milestones where project_id = p_project_id loop
    insert into public.escrow_ledger (project_id, milestone_id, amount, entry_type, status)
    values (p_project_id, v_milestone.id, v_milestone.payout_amount, 'HELD', 'secured');
  end loop;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Financial Access Control: Restrict start_milestone to verified freelancers
CREATE OR REPLACE FUNCTION public.start_milestone(p_milestone_id uuid)
RETURNS void AS $$
DECLARE
  v_milestone record;
BEGIN
  -- Select and lock milestone row
  SELECT * INTO v_milestone
  FROM public.milestones
  WHERE id = p_milestone_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  -- Verify client is not calling freelancer action and auth belongs to assignee
  IF auth.uid() IS NULL OR auth.uid() <> v_milestone.assigned_freelancer_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the assigned freelancer can start this milestone';
  END IF;

  -- Verify freelancer verification status
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'freelancer' AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only verified freelancers can start milestones';
  END IF;

  -- Validate transition NOT_STARTED -> IN_PROGRESS
  IF v_milestone.status <> 'NOT_STARTED' THEN
    RAISE EXCEPTION 'Invalid transition: Milestone must be in NOT_STARTED status. Current: %', v_milestone.status;
  END IF;

  -- Perform update
  UPDATE public.milestones
  SET status = 'IN_PROGRESS',
      updated_at = now()
  WHERE id = p_milestone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Financial Access Control: Restrict submit_milestone to verified freelancers
CREATE OR REPLACE FUNCTION public.submit_milestone(
  p_milestone_id uuid,
  p_description text
)
RETURNS void AS $$
DECLARE
  v_milestone record;
BEGIN
  -- Select and lock milestone row
  SELECT * INTO v_milestone
  FROM public.milestones
  WHERE id = p_milestone_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  -- Verify caller is the assigned freelancer
  IF auth.uid() IS NULL OR auth.uid() <> v_milestone.assigned_freelancer_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the assigned freelancer can submit work';
  END IF;

  -- Verify freelancer verification status
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'freelancer' AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only verified freelancers can submit work';
  END IF;

  -- Validate state is IN_PROGRESS
  IF v_milestone.status <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Invalid transition: Milestone must be in IN_PROGRESS status. Current: %', v_milestone.status;
  END IF;

  -- Update status, description, and submitted timestamp
  UPDATE public.milestones
  SET status = 'SUBMITTED',
      submission_description = p_description,
      submitted_at = now(),
      updated_at = now()
  WHERE id = p_milestone_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
