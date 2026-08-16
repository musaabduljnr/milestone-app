// Milestone Database Schema Interfaces (Phase 2 Types)

export type UserRole = "client" | "freelancer";
export type VerificationStatus = "pending" | "verified";
export type ProjectStatus = "draft" | "in_progress" | "completed" | "disputed";
export type MilestoneStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "PAID" | "DISPUTED";
export type EscrowEntryType = "FUNDED" | "HELD" | "RELEASED";
export type EscrowEntryStatus = "completed" | "secured" | "processing" | "failed";
export type DisputeStatus = "OPEN" | "RESOLVED";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";

/**
 * 1. Profiles Table
 */
export interface Profile {
  id: string; // references auth.users.id
  email?: string | null;
  full_name: string;
  avatar_url?: string | null;
  role?: UserRole | null;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

/**
 * 2. Projects Table
 */
export interface Project {
  id: string;
  client_id: string; // references public.profiles.id
  title: string;
  description?: string | null;
  category?: string | null;
  budget: number;
  currency: string;
  status: ProjectStatus;
  expected_completion?: string | null; // ISO Date string
  created_at: string;
  updated_at: string;
}

/**
 * 3. Project Members Table
 */
export interface ProjectMember {
  id: string;
  project_id: string; // references public.projects.id
  user_id: string; // references public.profiles.id
  role: UserRole;
  created_at: string;
}

/**
 * 4. Milestones Table
 */
export interface Milestone {
  id: string;
  project_id: string; // references public.projects.id
  title: string;
  description?: string | null;
  assigned_freelancer_id?: string | null; // references public.profiles.id
  payout_amount: number;
  deadline?: string | null;
  status: MilestoneStatus;
  submitted_at?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 5. Wallets Table
 */
export interface Wallet {
  id: string;
  user_id: string; // references public.profiles.id
  available_balance: number;
  pending_balance: number;
  created_at: string;
  updated_at: string;
}

/**
 * 6. Escrow Ledger Table
 */
export interface EscrowLedgerEntry {
  id: string;
  project_id: string; // references public.projects.id
  milestone_id: string; // references public.milestones.id
  amount: number;
  entry_type: EscrowEntryType;
  status: EscrowEntryStatus;
  created_at: string;
}

/**
 * 7. Messages Table
 */
export interface Message {
  id: string;
  project_id: string; // references public.projects.id
  sender_id: string; // references public.profiles.id
  recipient_id?: string | null; // references public.profiles.id
  content: string;
  created_at: string;
}

/**
 * 8. Attachments Table
 */
export interface Attachment {
  id: string;
  project_id: string; // references public.projects.id
  milestone_id?: string | null; // references public.milestones.id
  uploader_id: string; // references public.profiles.id
  filename: string;
  storage_path: string;
  content_type: string;
  size: number;
  created_at: string;
}

/**
 * 9. Disputes Table
 */
export interface Dispute {
  id: string;
  milestone_id: string; // references public.milestones.id
  opened_by: string; // references public.profiles.id
  reason: string;
  description?: string | null;
  status: DisputeStatus;
  created_at: string;
  resolved_at?: string | null;
}

/**
 * 10. Project Invitations Table (Phase 10A)
 */
export interface ProjectInvitation {
  id: string;
  project_id: string; // references public.projects.id
  milestone_id: string; // references public.milestones.id
  invited_by: string; // references public.profiles.id
  invitee_email: string;
  invitee_user_id?: string | null; // references public.profiles.id
  status: InvitationStatus;
  created_at: string;
  responded_at?: string | null;
  expires_at?: string | null;
}
