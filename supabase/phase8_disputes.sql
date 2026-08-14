-- PHASE 8 UPDATE: DISPUTES, RESOLUTION & TRUST
-- ====================================================================

-- 1. Extend disputes table to support status, project context, resolution and proposals
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_status_check CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'AWAITING_RESPONSE', 'RESOLVED_CLIENT', 'RESOLVED_FREELANCER', 'CLOSED'));

ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS against_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolution text CHECK (resolution IN ('CLIENT_FAVORED', 'FREELANCER_FAVORED', 'PARTIAL_RESOLUTION'));
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolution_note text;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

-- Resolution proposal fields for P2P split agreements
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS proposal_client_amount numeric(12, 2);
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS proposal_freelancer_amount numeric(12, 2);
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS proposal_note text;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS proposal_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS proposal_at timestamp with time zone;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_disputes_project_id ON public.disputes(project_id);

-- Backfill project_id and against_user_id for any existing disputes
UPDATE public.disputes d
SET project_id = m.project_id,
    against_user_id = CASE WHEN d.opened_by = p.client_id THEN m.assigned_freelancer_id ELSE p.client_id END
FROM public.milestones m
JOIN public.projects p ON p.id = m.project_id
WHERE m.id = d.milestone_id;

-- 2. Associate attachments with disputes for secure evidence
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS dispute_id uuid REFERENCES public.disputes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_attachments_dispute_id ON public.attachments(dispute_id);

-- 3. Extend escrow ledger entry types to support refunds
ALTER TABLE public.escrow_ledger DROP CONSTRAINT IF EXISTS escrow_ledger_entry_type_check;
ALTER TABLE public.escrow_ledger ADD CONSTRAINT escrow_ledger_entry_type_check CHECK (entry_type IN ('FUNDED', 'HELD', 'RELEASED', 'REFUNDED'));

-- 4. Re-create dispute_milestone with extended details and safe search paths
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
  v_against_user_id uuid;
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

  -- Resolve opposing party
  IF auth.uid() = v_client_id THEN
    v_against_user_id := v_freelancer_id;
  ELSE
    v_against_user_id := v_client_id;
  END IF;

  -- Update status to DISPUTED
  UPDATE public.milestones
  SET status = 'DISPUTED',
      updated_at = now()
  WHERE id = p_milestone_id;

  -- Insert record in disputes table
  INSERT INTO public.disputes (
    milestone_id,
    project_id,
    opened_by,
    against_user_id,
    reason,
    description,
    status
  )
  VALUES (
    p_milestone_id,
    v_project.id,
    auth.uid(),
    v_against_user_id,
    p_reason,
    p_description,
    'OPEN'
  )
  ON CONFLICT (milestone_id) DO UPDATE
  SET status = 'OPEN',
      project_id = EXCLUDED.project_id,
      opened_by = EXCLUDED.opened_by,
      against_user_id = EXCLUDED.against_user_id,
      reason = EXCLUDED.reason,
      description = EXCLUDED.description,
      resolved_at = NULL,
      resolution = NULL,
      resolution_note = NULL,
      resolved_by = NULL,
      updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. RPC: resolve_dispute_secure
-- Performs atomic transfer and state mutation inside transaction block.
CREATE OR REPLACE FUNCTION public.resolve_dispute_secure(
  p_dispute_id uuid,
  p_outcome text, -- 'CLIENT_FAVORED', 'FREELANCER_FAVORED', 'PARTIAL_RESOLUTION'
  p_resolution_note text,
  p_client_amount numeric,
  p_freelancer_amount numeric
)
RETURNS void AS $$
DECLARE
  v_dispute record;
  v_milestone record;
  v_project record;
  v_client_id uuid;
  v_freelancer_id uuid;
  v_client_wallet record;
  v_freelancer_wallet record;
  v_total_amount numeric;
BEGIN
  -- 1. Lock the dispute row
  SELECT * INTO v_dispute
  FROM public.disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;

  IF v_dispute.status IN ('RESOLVED_CLIENT', 'RESOLVED_FREELANCER', 'CLOSED') THEN
    RAISE EXCEPTION 'Dispute is already resolved';
  END IF;

  -- 2. Fetch milestone and project details
  SELECT * INTO v_milestone
  FROM public.milestones
  WHERE id = v_dispute.milestone_id;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_milestone.project_id;

  v_client_id := v_project.client_id;
  v_freelancer_id := v_milestone.assigned_freelancer_id;

  -- 3. Verify total resolution amounts matches milestone payout
  v_total_amount := p_client_amount + p_freelancer_amount;
  IF ABS(v_total_amount - v_milestone.payout_amount) > 0.01 THEN
    RAISE EXCEPTION 'Resolution amounts sum (%) must equal milestone payout (%)', v_total_amount, v_milestone.payout_amount;
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

  -- Verify client pending balance has enough held escrow funds
  IF v_client_wallet.pending_balance < v_milestone.payout_amount THEN
    RAISE EXCEPTION 'Insufficient escrow balance. Held: %, Required: %', v_client_wallet.pending_balance, v_milestone.payout_amount;
  END IF;

  -- 5. Deduct milestone payout from client's pending balance
  UPDATE public.wallets
  SET pending_balance = pending_balance - v_milestone.payout_amount,
      updated_at = now()
  WHERE user_id = v_client_id;

  -- 6. Add client_amount to client's available balance
  IF p_client_amount > 0 THEN
    UPDATE public.wallets
    SET available_balance = available_balance + p_client_amount,
        updated_at = now()
    WHERE user_id = v_client_id;

    -- Record REFUNDED entry in escrow ledger
    INSERT INTO public.escrow_ledger (project_id, milestone_id, amount, entry_type, status)
    VALUES (v_project.id, v_milestone.id, p_client_amount, 'REFUNDED', 'completed');
  END IF;

  -- 7. Add freelancer_amount to freelancer's available balance
  IF p_freelancer_amount > 0 THEN
    UPDATE public.wallets
    SET available_balance = available_balance + p_freelancer_amount,
        updated_at = now()
    WHERE user_id = v_freelancer_id;

    -- Record RELEASED entry in escrow ledger
    INSERT INTO public.escrow_ledger (project_id, milestone_id, amount, entry_type, status)
    VALUES (v_project.id, v_milestone.id, p_freelancer_amount, 'RELEASED', 'completed');
  END IF;

  -- 8. Update milestone status
  IF p_freelancer_amount > 0 THEN
    UPDATE public.milestones
    SET status = 'PAID',
        paid_at = now(),
        updated_at = now()
    where id = v_milestone.id;
  ELSE
    UPDATE public.milestones
    SET status = 'NOT_STARTED',
        updated_at = now()
    where id = v_milestone.id;
  END IF;

  -- 9. Update dispute status
  UPDATE public.disputes
  SET status = CASE WHEN p_outcome = 'CLIENT_FAVORED' THEN 'RESOLVED_CLIENT'
                    WHEN p_outcome = 'FREELANCER_FAVORED' THEN 'RESOLVED_FREELANCER'
                    ELSE 'CLOSED' END,
      resolution = p_outcome,
      resolution_note = p_resolution_note,
      resolved_by = auth.uid(),
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_dispute_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. Storage Bucket setup for Dispute Evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-evidence', 'dispute-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for private dispute evidence
DROP POLICY IF EXISTS "Allow members to upload dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Allow members to select dispute evidence" ON storage.objects;

CREATE POLICY "Allow members to upload dispute evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dispute-evidence' AND
    (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id::text = (regexp_split_to_array(name, '/'))[1] AND p.client_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id::text = (regexp_split_to_array(name, '/'))[1] AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Allow members to select dispute evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dispute-evidence' AND
    (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id::text = (regexp_split_to_array(name, '/'))[1] AND p.client_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id::text = (regexp_split_to_array(name, '/'))[1] AND pm.user_id = auth.uid()
      )
    )
  );
