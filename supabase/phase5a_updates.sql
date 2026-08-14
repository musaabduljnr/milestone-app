-- Phase 5A: Simulated Identity Verification Foundation Updates

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

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
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS enforce_verification_status_protection ON public.profiles;
CREATE TRIGGER enforce_verification_status_protection
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_verification_status();

-- 8. Audit log for verification changes
CREATE TABLE IF NOT EXISTS public.verification_audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null check (action in ('STARTED', 'COMPLETED', 'FAILED')),
  document_path text,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on audit logs
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read own verification audit logs" ON public.verification_audit_log;
CREATE POLICY "Allow users to read own verification audit logs"
  ON public.verification_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- 9. RPC: Start Mock Verification (eligibility check & set to pending)
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

  -- Insert into audit log
  INSERT INTO public.verification_audit_log (user_id, action, document_path, ip_address)
  VALUES (v_uid, 'STARTED', v_profile.photo_id_path, inet_client_addr()::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 10. RPC: Complete Mock Verification (transition pending to verified)
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

  -- Validate flow initiation checks to prevent instant client bypasses
  IF v_profile.verification_started_at IS NULL THEN
    RAISE EXCEPTION 'Verification process has not been started';
  END IF;

  IF v_profile.date_of_birth IS NULL THEN
    RAISE EXCEPTION 'Date of birth is required';
  END IF;

  IF v_profile.photo_id_path IS NULL OR v_profile.photo_id_path = '' THEN
    RAISE EXCEPTION 'Photo ID document path is required';
  END IF;

  -- Set config session variable to allow transition
  PERFORM set_config('app.performing_verification', 'true', true);

  UPDATE public.profiles
  SET verification_status = 'verified',
      verification_verified_at = now(),
      updated_at = now()
  WHERE id = v_uid;

  -- Insert into audit log
  INSERT INTO public.verification_audit_log (user_id, action, document_path, ip_address)
  VALUES (v_uid, 'COMPLETED', v_profile.photo_id_path, inet_client_addr()::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
