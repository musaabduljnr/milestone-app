-- Phase 4B Milestone Engine Database Updates

-- 1. Alter Check Constraint on Milestone Status to allow 'AUTO_RELEASED'
ALTER TABLE public.milestones DROP CONSTRAINT IF EXISTS milestones_status_check;
ALTER TABLE public.milestones ADD CONSTRAINT milestones_status_check 
  CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'PAID', 'DISPUTED', 'AUTO_RELEASED'));

-- 2. Add Submission Description Column to Milestones Table
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS submission_description text;

-- 3. RPC: Start Milestone
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

-- 4. RPC: Submit Milestone Work
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

-- 5. RPC: Release Milestone Payment (Manual Approval or Auto-Release)
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

-- 6. RPC: Dispute Milestone
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
