"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { SupabaseClient } from "@supabase/supabase-js";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper to verify user belongs to the project of the dispute.
 */
async function verifyProjectMember(supabase: SupabaseClient, projectId: string, userId: string): Promise<boolean> {
  // Check if owner
  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .single();

  if (project?.client_id === userId) return true;

  // Check if member
  const { data: member } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  return !!member;
}

/**
 * Server Action: Concede a dispute unilaterally.
 * - Client concedes to Freelancer (FREELANCER_FAVORED)
 * - Freelancer concedes to Client (CLIENT_FAVORED)
 */
export async function concedeDisputeAction(
  disputeId: string,
  concedeToRole: "client" | "freelancer"
): Promise<ActionResponse<Record<string, unknown>>> {
  if (!disputeId) return { success: false, error: "Dispute ID is required." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  try {
    // Fetch dispute, milestone, and project
    const { data: dispute, error: dError } = await supabase
      .from("disputes")
      .select("*, milestone:milestones(*, project:projects(*))")
      .eq("id", disputeId)
      .single();

    if (dError || !dispute || !dispute.milestone || !dispute.milestone.project) {
      return { success: false, error: "Dispute context not found." };
    }

    const milestone = dispute.milestone;
    const project = milestone.project;
    const clientVal = project.client_id;
    const freelancerVal = milestone.assigned_freelancer_id;

    let outcome: "CLIENT_FAVORED" | "FREELANCER_FAVORED";
    let resolutionNote: string;
    let clientAmt = 0;
    let freelancerAmt = 0;

    if (concedeToRole === "freelancer") {
      // Client is conceding to Freelancer
      if (user.id !== clientVal) {
        return { success: false, error: "Unauthorized: Only the project client can concede to the freelancer." };
      }
      outcome = "FREELANCER_FAVORED";
      resolutionNote = "Client conceded milestone payout to freelancer.";
      freelancerAmt = Number(milestone.payout_amount);
    } else {
      // Freelancer is conceding to Client
      if (user.id !== freelancerVal) {
        return { success: false, error: "Unauthorized: Only the assigned freelancer can concede to the client." };
      }
      outcome = "CLIENT_FAVORED";
      resolutionNote = "Freelancer conceded milestone payout to client.";
      clientAmt = Number(milestone.payout_amount);
    }

    // Call resolution RPC
    const { error: rpcError } = await supabase.rpc("resolve_dispute_secure", {
      p_dispute_id: disputeId,
      p_outcome: outcome,
      p_resolution_note: resolutionNote,
      p_client_amount: clientAmt,
      p_freelancer_amount: freelancerAmt,
    });

    if (rpcError) throw rpcError;

    // Trigger Notification for the conceded party
    const recipientId = user.id === clientVal ? freelancerVal : clientVal;
    if (recipientId) {
      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "DISPUTE_RESOLVED",
        title: "Dispute Conceded & Resolved",
        message: `The dispute on milestone "${milestone.title}" was resolved through a concession.`,
        project_id: project.id,
        milestone_id: milestone.id,
      });
    }

    revalidatePath(`/projects/${project.id}`);
    revalidatePath(`/projects/${project.id}/disputes/${disputeId}`);
    revalidatePath(`/freelancer/milestones/${milestone.id}`);
    revalidatePath("/wallet");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    console.error("concedeDisputeAction Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to resolve dispute." };
  }
}

/**
 * Server Action: Submit a resolution split proposal.
 */
export async function proposeDisputeResolutionAction(
  disputeId: string,
  clientAmount: number,
  freelancerAmount: number,
  note: string
): Promise<ActionResponse<Record<string, unknown>>> {
  if (!disputeId) return { success: false, error: "Dispute ID is required." };
  if (clientAmount < 0 || freelancerAmount < 0) {
    return { success: false, error: "Split amounts cannot be negative." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  try {
    const { data: dispute, error: dError } = await supabase
      .from("disputes")
      .select("*, milestone:milestones(*, project:projects(*))")
      .eq("id", disputeId)
      .single();

    if (dError || !dispute || !dispute.milestone || !dispute.milestone.project) {
      return { success: false, error: "Dispute context not found." };
    }

    const milestone = dispute.milestone;
    const project = milestone.project;
    const clientVal = project.client_id;
    const freelancerVal = milestone.assigned_freelancer_id;

    if (user.id !== clientVal && user.id !== freelancerVal) {
      return { success: false, error: "Unauthorized access to project disputes." };
    }

    const totalAmt = clientAmount + freelancerAmount;
    if (Math.abs(totalAmt - Number(milestone.payout_amount)) > 0.01) {
      return { success: false, error: `Proposed split amounts must sum to ${project.currency} ${Number(milestone.payout_amount).toFixed(2)}.` };
    }

    // Save proposal fields and set status to AWAITING_RESPONSE
    const { error: updateError } = await supabase
      .from("disputes")
      .update({
        status: "AWAITING_RESPONSE",
        proposal_client_amount: clientAmount,
        proposal_freelancer_amount: freelancerAmount,
        proposal_note: note,
        proposal_by: user.id,
        proposal_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    if (updateError) throw updateError;

    // Send Notification to Opposing Party
    const recipientId = user.id === clientVal ? freelancerVal : clientVal;
    if (recipientId) {
      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "RESPONSE_REQUESTED",
        title: "Dispute Proposal Submitted",
        message: `A resolution split of ${project.currency} ${freelancerAmount.toFixed(2)} / ${clientAmount.toFixed(2)} has been proposed.`,
        project_id: project.id,
        milestone_id: milestone.id,
      });
    }

    revalidatePath(`/projects/${project.id}/disputes/${disputeId}`);
    revalidatePath(`/freelancer/milestones/${milestone.id}`);

    return { success: true };
  } catch (err: unknown) {
    console.error("proposeDisputeResolutionAction Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to propose resolution." };
  }
}

/**
 * Server Action: Accept a resolution split proposal.
 */
export async function acceptDisputeProposalAction(
  disputeId: string
): Promise<ActionResponse<Record<string, unknown>>> {
  if (!disputeId) return { success: false, error: "Dispute ID is required." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  try {
    const { data: dispute, error: dError } = await supabase
      .from("disputes")
      .select("*, milestone:milestones(*, project:projects(*))")
      .eq("id", disputeId)
      .single();

    if (dError || !dispute || !dispute.milestone || !dispute.milestone.project) {
      return { success: false, error: "Dispute context not found." };
    }

    const milestone = dispute.milestone;
    const project = milestone.project;
    const clientVal = project.client_id;
    const freelancerVal = milestone.assigned_freelancer_id;

    if (dispute.status !== "AWAITING_RESPONSE") {
      return { success: false, error: "No active proposal awaits action." };
    }

    if (dispute.proposal_by === user.id) {
      return { success: false, error: "You cannot accept your own proposed resolution." };
    }

    if (user.id !== clientVal && user.id !== freelancerVal) {
      return { success: false, error: "Unauthorized dispute access." };
    }

    let outcome: "CLIENT_FAVORED" | "FREELANCER_FAVORED" | "PARTIAL_RESOLUTION" = "PARTIAL_RESOLUTION";
    const clientAmt = Number(dispute.proposal_client_amount);
    const freelancerAmt = Number(dispute.proposal_freelancer_amount);

    if (clientAmt === 0) outcome = "FREELANCER_FAVORED";
    else if (freelancerAmt === 0) outcome = "CLIENT_FAVORED";

    // Call secure resolution RPC to transfer wallets balance
    const { error: rpcError } = await supabase.rpc("resolve_dispute_secure", {
      p_dispute_id: disputeId,
      p_outcome: outcome,
      p_resolution_note: dispute.proposal_note || "Resolution proposal mutually accepted.",
      p_client_amount: clientAmt,
      p_freelancer_amount: freelancerAmt,
    });

    if (rpcError) throw rpcError;

    // Send Notification to Proposer
    const recipientId = dispute.proposal_by;
    if (recipientId) {
      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "DISPUTE_RESOLVED",
        title: "Proposal Accepted & Resolved",
        message: `Your resolution proposal for milestone "${milestone.title}" has been accepted.`,
        project_id: project.id,
        milestone_id: milestone.id,
      });
    }

    revalidatePath(`/projects/${project.id}`);
    revalidatePath(`/projects/${project.id}/disputes/${disputeId}`);
    revalidatePath(`/freelancer/milestones/${milestone.id}`);
    revalidatePath("/wallet");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    console.error("acceptDisputeProposalAction Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to accept proposal." };
  }
}

/**
 * Server Action: Decline a resolution proposal.
 */
export async function rejectDisputeProposalAction(
  disputeId: string
): Promise<ActionResponse<Record<string, unknown>>> {
  if (!disputeId) return { success: false, error: "Dispute ID is required." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  try {
    const { data: dispute, error: dError } = await supabase
      .from("disputes")
      .select("*, milestone:milestones(*, project:projects(*))")
      .eq("id", disputeId)
      .single();

    if (dError || !dispute || !dispute.milestone || !dispute.milestone.project) {
      return { success: false, error: "Dispute context not found." };
    }

    const milestone = dispute.milestone;
    const project = milestone.project;

    if (dispute.status !== "AWAITING_RESPONSE") {
      return { success: false, error: "No active proposal exists to decline." };
    }

    if (dispute.proposal_by === user.id) {
      return { success: false, error: "You cannot reject your own proposal." };
    }

    if (user.id !== project.client_id && user.id !== milestone.assigned_freelancer_id) {
      return { success: false, error: "Unauthorized access." };
    }

    // Reset proposal details and set status back to UNDER_REVIEW
    const { error: updateError } = await supabase
      .from("disputes")
      .update({
        status: "UNDER_REVIEW",
        proposal_client_amount: null,
        proposal_freelancer_amount: null,
        proposal_note: null,
        proposal_by: null,
        proposal_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    if (updateError) throw updateError;

    // Send Notification to Proposer
    const recipientId = dispute.proposal_by;
    if (recipientId) {
      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "RESPONSE_RECEIVED",
        title: "Proposal Declined",
        message: `The resolution proposal for milestone "${milestone.title}" has been declined.`,
        project_id: project.id,
        milestone_id: milestone.id,
      });
    }

    revalidatePath(`/projects/${project.id}/disputes/${disputeId}`);
    revalidatePath(`/freelancer/milestones/${milestone.id}`);

    return { success: true };
  } catch (err: unknown) {
    console.error("rejectDisputeProposalAction Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to decline proposal." };
  }
}

/**
 * Server Action: Generate a secure signed URL for evidence review.
 */
export async function getEvidenceSignedUrlAction(
  filePath: string
): Promise<ActionResponse<string>> {
  if (!filePath) return { success: false, error: "File path is required." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request." };
  }

  // Parse project ID from the path segment: {projectId}/{disputeId}/{filename}
  const pathParts = filePath.split("/");
  const projectId = pathParts[0];

  if (!projectId) {
    return { success: false, error: "Invalid document storage path structure." };
  }

  try {
    // Validate project membership
    const isMember = await verifyProjectMember(supabase, projectId, user.id);
    if (!isMember) {
      return { success: false, error: "Unauthorized access: You are not a member of this project." };
    }

    // Create secure short-lived signed url (expiry: 60s)
    const { data, error: storageError } = await supabase.storage
      .from("dispute-evidence")
      .createSignedUrl(filePath, 60);

    if (storageError || !data?.signedUrl) {
      throw storageError || new Error("Failed to generate signed URL.");
    }

    return { success: true, data: data.signedUrl };
  } catch (err: unknown) {
    console.error("getEvidenceSignedUrlAction Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to retrieve document link." };
  }
}

/**
 * Server Action: Insert metadata for uploaded evidence file.
 */
export async function uploadEvidenceMetadataAction(
  disputeId: string,
  projectId: string,
  filename: string,
  storagePath: string,
  contentType: string,
  size: number
): Promise<ActionResponse<Record<string, unknown>>> {
  if (!disputeId || !projectId || !filename || !storagePath) {
    return { success: false, error: "Missing required evidence fields." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request." };
  }

  try {
    // Validate project membership
    const isMember = await verifyProjectMember(supabase, projectId, user.id);
    if (!isMember) {
      return { success: false, error: "Unauthorized." };
    }

    const { data: dispute } = await supabase
      .from("disputes")
      .select("milestone_id, against_user_id")
      .eq("id", disputeId)
      .single();

    if (!dispute) return { success: false, error: "Dispute not found." };

    // Insert metadata record in attachments table
    const { error: dbError } = await supabase
      .from("attachments")
      .insert({
        project_id: projectId,
        milestone_id: dispute.milestone_id,
        dispute_id: disputeId,
        uploader_id: user.id,
        filename,
        storage_path: storagePath,
        content_type: contentType,
        size,
      });

    if (dbError) throw dbError;

    // Notify opposing party
    if (dispute.against_user_id) {
      await supabase.from("notifications").insert({
        user_id: dispute.against_user_id,
        type: "RESPONSE_RECEIVED",
        title: "Dispute Evidence Submitted",
        message: `New evidence was uploaded to the dispute workspace: "${filename}".`,
        project_id: projectId,
        milestone_id: dispute.milestone_id,
      });
    }

    revalidatePath(`/projects/${projectId}/disputes/${disputeId}`);

    return { success: true };
  } catch (err: unknown) {
    console.error("uploadEvidenceMetadataAction Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to record evidence details." };
  }
}
