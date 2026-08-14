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

-- Transaction RPC: create project and milestones atomically
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
  v_milestone jsonb;
  v_client_id uuid;
  v_freelancer_id uuid;
begin
  -- Get the authenticated client ID
  v_client_id := auth.uid();
  if v_client_id is null then
    raise exception 'Unauthenticated request';
  end if;

  -- Verify client role
  if not exists (select 1 from public.profiles where id = v_client_id and role = 'client') then
    raise exception 'Unauthorized: Only clients can create projects';
  end if;

  -- 1. Insert the project row
  insert into public.projects (
    client_id, title, description, category, budget, currency, status, expected_completion
  ) values (
    v_client_id, p_title, p_description, p_category, p_budget, p_currency, 'draft', p_expected_completion
  ) returning id into v_project_id;

  -- 2. Insert the client membership row
  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_client_id, 'client');

  -- 3. Loop through milestones and insert them
  for v_milestone in select * from jsonb_array_elements(p_milestones) loop
    -- Resolve freelancer assignment if present
    v_freelancer_id := null;
    if v_milestone->>'assigned_freelancer_id' is not null and v_milestone->>'assigned_freelancer_id' <> '' then
      v_freelancer_id := (v_milestone->>'assigned_freelancer_id')::uuid;

      -- Validate assigned user is actually a freelancer
      if not exists (select 1 from public.profiles where id = v_freelancer_id and role = 'freelancer') then
        raise exception 'Invalid assignment: User is not a freelancer';
      end if;

      -- Insert freelancer membership (unique constraints prevent duplicates)
      insert into public.project_members (project_id, user_id, role)
      values (v_project_id, v_freelancer_id, 'freelancer')
      on conflict (project_id, user_id) do nothing;
    end if;

    -- Insert milestone
    insert into public.milestones (
      project_id, title, description, assigned_freelancer_id, payout_amount, deadline, status
    ) values (
      v_project_id,
      v_milestone->>'title',
      v_milestone->>'description',
      v_freelancer_id,
      (v_milestone->>'payout_amount')::numeric,
      (v_milestone->>'deadline')::timestamp with time zone,
      'NOT_STARTED'
    );
  end loop;

  return v_project_id;
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
