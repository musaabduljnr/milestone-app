-- ==============================================================================
-- Milestone Platform — Phase 10A Database Migration
-- Freelancer Invitation Workflow + Transactional Project Creation RPCs
-- ==============================================================================

-- 1. Extend public.profiles with email column (if not already existing)
alter table public.profiles add column if not exists email text;

-- Backfill profile emails from auth.users
do $$
begin
  update public.profiles p
  set email = lower(u.email)
  from auth.users u
  where p.id = u.id and (p.email is null or p.email = '');
exception when others then
  -- In case auth.users is restricted during migration
  null;
end $$;

create index if not exists idx_profiles_email on public.profiles(lower(email));

-- 2. Update handle_new_user trigger to save email on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role, verification_status)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    null,
    'pending'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end;

  insert into public.wallets (user_id, available_balance, pending_balance)
  values (
    new.id,
    0.00,
    0.00
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- 3. Create public.project_invitations table
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

-- Indexes for optimal querying and constraint enforcement
create index if not exists idx_project_invitations_project_id on public.project_invitations(project_id);
create index if not exists idx_project_invitations_milestone_id on public.project_invitations(milestone_id);
create index if not exists idx_project_invitations_invited_by on public.project_invitations(invited_by);
create index if not exists idx_project_invitations_invitee_email on public.project_invitations(lower(invitee_email));
create index if not exists idx_project_invitations_invitee_user_id on public.project_invitations(invitee_user_id);
create index if not exists idx_project_invitations_status on public.project_invitations(status);

-- 4. Enable Row Level Security (RLS) on project_invitations
alter table public.project_invitations enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Allow select invitations for participants" on public.project_invitations;
drop policy if exists "Allow insert invitations for project client" on public.project_invitations;
drop policy if exists "Allow update invitations for participants" on public.project_invitations;

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

-- 5. Safe Freelancer Lookup RPC
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

-- 6. Atomic Project & Milestones Creation with Invitations RPC
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
  v_freelancer_profile record;
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

-- 7. Accept Invitation RPC
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

  -- Fallback to auth.jwt email if profiles.email is null
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

-- 8. Decline Invitation RPC
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

-- 9. Client Invite / Re-invite Freelancer to Milestone RPC
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

-- Fix profiles select RLS policy (allow reading basic profiles for authenticated users)
drop policy if exists "Allow profile read if own or authenticated" on public.profiles;
create policy "Allow profile read if own or authenticated"
  on public.profiles for select
  using (auth.uid() is not null);

-- Fix projects/project_members infinite recursion RLS bug
drop policy if exists "Allow members select membership info" on public.project_members;
create policy "Allow members select membership info"
  on public.project_members for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.projects p 
      where p.id = project_id and p.client_id = auth.uid()
    )
  );

