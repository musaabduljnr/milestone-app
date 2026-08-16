"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateProjectParams {
  title: string;
  description: string;
  category: string;
  budget: number;
  currency: string;
  expected_completion: string; // ISO date string YYYY-MM-DD
  milestones: {
    title: string;
    description: string;
    payout_amount: number;
    deadline: string; // ISO timestamp
    assigned_freelancer_id?: string | null;
    assigned_freelancer_email?: string | null;
  }[];
}

export interface FreelancerLookupResult {
  exists: boolean;
  id?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string | null;
  verification_status?: string;
}

/**
 * Fetch registered freelancers (with safe public fields).
 */
export async function getFreelancers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email, verification_status")
    .eq("role", "freelancer");

  if (error) {
    console.error("Error fetching freelancers list:", error);
    return [];
  }

  return data || [];
}

/**
 * Safe server action to look up a freelancer by email.
 * Normalizes email and checks for freelancer role without exposing sensitive data.
 */
export async function lookupFreelancerByEmailAction(
  email: string
): Promise<{ success: boolean; data?: FreelancerLookupResult; error?: string }> {
  if (!email || !email.trim()) {
    return { success: false, error: "Please provide an email address." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  // Basic RFC5322 regex check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: "Please enter a valid email address format." };
  }

  const supabase = await createClient();

  // Try RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc("lookup_freelancer_by_email", {
    p_email: normalizedEmail,
  });

  if (!rpcError && rpcData) {
    const result = rpcData as FreelancerLookupResult;
    return { success: true, data: result };
  }

  // Fallback: direct profiles query
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, verification_status, email")
    .eq("role", "freelancer")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profileError) {
    console.error("Error querying profile by email:", profileError);
    return { success: false, error: "Failed to verify freelancer email." };
  }

  if (!profile) {
    return {
      success: true,
      data: { exists: false },
    };
  }

  return {
    success: true,
    data: {
      exists: true,
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      verification_status: profile.verification_status,
      email: profile.email || normalizedEmail,
    },
  };
}

/**
 * Server Action creating project, milestones, and freelancer invitations atomically.
 */
export async function createProjectAction(params: CreateProjectParams) {
  const supabase = await createClient();

  // 1. Authenticate user session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // 2. Authorize user role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "client") {
    return { success: false, error: "Unauthorized: Only clients can create projects." };
  }

  // 3. Validate Project basics
  const { title, description, category, budget, currency, expected_completion, milestones } = params;

  if (!title || !description || !category || !expected_completion) {
    return { success: false, error: "Project title, category, description, and completion date are required." };
  }

  if (budget <= 0) {
    return { success: false, error: "Total project budget must be greater than 0." };
  }

  // 4. Validate Milestones constraints
  if (!milestones || milestones.length < 2 || milestones.length > 6) {
    return { success: false, error: "Projects must contain between 2 and 6 milestones." };
  }

  let totalPayout = 0;
  for (const m of milestones) {
    if (!m.title || !m.deadline) {
      return { success: false, error: "All milestones require a title and deadline." };
    }
    if (m.payout_amount <= 0) {
      return { success: false, error: "Milestone payout amounts must be greater than 0." };
    }
    totalPayout += m.payout_amount;
  }

  // Enforce total payouts equals project budget
  if (Math.abs(totalPayout - budget) > 0.01) {
    return {
      success: false,
      error: `Total milestone allocations ($${totalPayout.toLocaleString()}) must equal the project budget ($${budget.toLocaleString()}).`,
    };
  }

  // Format milestones payload for RPC
  const rpcMilestones = milestones.map((m) => ({
    title: m.title.trim(),
    description: (m.description || "").trim(),
    payout_amount: m.payout_amount,
    deadline: m.deadline.includes("T") ? m.deadline : new Date(m.deadline).toISOString(),
    assigned_freelancer_email: m.assigned_freelancer_email ? m.assigned_freelancer_email.trim().toLowerCase() : null,
    assigned_freelancer_id: m.assigned_freelancer_id || null,
  }));

  // 5. Invoke atomic database RPC transaction
  const { data: projectId, error: rpcError } = await supabase.rpc(
    "create_project_with_milestones",
    {
      p_title: title.trim(),
      p_description: description.trim(),
      p_category: category.trim(),
      p_budget: budget,
      p_currency: currency || "USD",
      p_expected_completion: expected_completion,
      p_milestones: rpcMilestones,
    }
  );

  if (rpcError) {
    console.error("RPC creation transaction failed:", rpcError);
    return { success: false, error: rpcError.message || "Failed to create project database records." };
  }

  // Revalidate relevant dashboard caches
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }

  return { success: true, projectId };
}

/**
 * Server Action for freelancer to accept a project invitation atomically.
 */
export async function acceptInvitationAction(invitationId: string) {
  if (!invitationId) return { success: false, error: "Invitation ID is required." };

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc("accept_invitation", {
    p_invitation_id: invitationId,
  });

  if (rpcError) {
    console.error("RPC accept_invitation failed:", rpcError);
    return { success: false, error: rpcError.message || "Failed to accept project invitation." };
  }

  const res = rpcResult as { success: boolean; project_id: string; milestone_id: string };

  if (res?.project_id) {
    revalidatePath(`/projects/${res.project_id}`);
    revalidatePath(`/freelancer/milestones/${res.milestone_id}`);
    revalidatePath(`/invitations/${invitationId}`);
    revalidatePath("/dashboard");
    revalidatePath("/activity");
  }

  return {
    success: true,
    projectId: res?.project_id,
    milestoneId: res?.milestone_id,
  };
}

/**
 * Server Action for freelancer to decline a project invitation.
 */
export async function declineInvitationAction(invitationId: string) {
  if (!invitationId) return { success: false, error: "Invitation ID is required." };

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc("decline_invitation", {
    p_invitation_id: invitationId,
  });

  if (rpcError) {
    console.error("RPC decline_invitation failed:", rpcError);
    return { success: false, error: rpcError.message || "Failed to decline invitation." };
  }

  revalidatePath(`/invitations/${invitationId}`);
  revalidatePath("/dashboard");
  revalidatePath("/activity");

  return { success: true };
}

/**
 * Server Action to fetch details of an invitation by invitation ID or milestone ID.
 */
export async function getInvitationDetailsAction(id: string) {
  if (!id) return { success: false, error: "Invitation identifier is required." };

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // Query invitation by ID or milestone_id for current user
  let query = supabase
    .from("project_invitations")
    .select(`
      *,
      projects:project_id (
        id,
        title,
        description,
        category,
        budget,
        currency,
        status,
        expected_completion,
        client_id,
        profiles:client_id (
          id,
          full_name,
          avatar_url,
          verification_status
        )
      ),
      milestones:milestone_id (
        id,
        title,
        description,
        payout_amount,
        deadline,
        status,
        assigned_freelancer_id
      )
    `);

  // Check if id matches an invitation id or milestone id
  const { data: invById } = await query.eq("id", id).maybeSingle();

  let invitation = invById;
  if (!invitation) {
    // Try by milestone_id where user is the invitee
    const userEmail = (user.email || "").toLowerCase();
    const { data: invByMilestone } = await supabase
      .from("project_invitations")
      .select(`
        *,
        projects:project_id (
          id,
          title,
          description,
          category,
          budget,
          currency,
          status,
          expected_completion,
          client_id,
          profiles:client_id (
            id,
            full_name,
            avatar_url,
            verification_status
          )
        ),
        milestones:milestone_id (
          id,
          title,
          description,
          payout_amount,
          deadline,
          status,
          assigned_freelancer_id
        )
      `)
      .eq("milestone_id", id)
      .or(`invitee_user_id.eq.${user.id},invitee_email.ilike.${userEmail}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    invitation = invByMilestone;
  }

  if (!invitation) {
    return { success: false, error: "Invitation not found or access denied." };
  }

  return { success: true, invitation };
}

/**
 * Server Action for client to invite/reinvite a freelancer to a specific milestone.
 */
export async function inviteFreelancerToMilestoneAction(milestoneId: string, email: string) {
  if (!milestoneId || !email) {
    return { success: false, error: "Milestone ID and freelancer email are required." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc("invite_freelancer_to_milestone", {
    p_milestone_id: milestoneId,
    p_email: email.trim().toLowerCase(),
  });

  if (rpcError) {
    console.error("RPC invite_freelancer_to_milestone failed:", rpcError);
    return { success: false, error: rpcError.message || "Failed to send invitation." };
  }

  // Revalidate project paths
  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id")
    .eq("id", milestoneId)
    .single();

  if (milestone) {
    revalidatePath(`/projects/${milestone.project_id}`);
    revalidatePath(`/freelancer/milestones/${milestoneId}`);
    revalidatePath("/activity");
  }

  return { success: true, data: rpcResult };
}

/**
 * Fetch pending invitations for the current logged-in freelancer.
 */
export async function getFreelancerPendingInvitationsAction() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthenticated request.", data: [] };
  }

  const userEmail = (user.email || "").toLowerCase();

  const { data, error } = await supabase
    .from("project_invitations")
    .select(`
      id,
      project_id,
      milestone_id,
      invitee_email,
      status,
      created_at,
      projects:project_id (
        id,
        title,
        currency,
        client_id,
        profiles:client_id (
          full_name,
          avatar_url
        )
      ),
      milestones:milestone_id (
        id,
        title,
        payout_amount,
        deadline
      )
    `)
    .eq("status", "PENDING")
    .or(`invitee_user_id.eq.${user.id},invitee_email.ilike.${userEmail}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending invitations:", error);
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data || [] };
}


/**
 * Server Action for freelancer to start an assigned milestone.
 */
export async function startMilestoneAction(milestoneId: string) {
  if (!milestoneId) return { success: false, error: "Milestone ID is required." };

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  const { error } = await supabase.rpc("start_milestone", {
    p_milestone_id: milestoneId,
  });

  if (error) {
    console.error("RPC start_milestone failed:", error);
    return { success: false, error: error.message || "Failed to start milestone." };
  }

  // Revalidate project paths
  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id")
    .eq("id", milestoneId)
    .single();

  if (milestone) {
    revalidatePath(`/projects/${milestone.project_id}`);
    revalidatePath(`/freelancer/milestones/${milestoneId}`);
    revalidatePath("/dashboard");
  }

  return { success: true };
}

/**
 * Server Action for freelancer to submit milestone work.
 */
export async function submitMilestoneAction(milestoneId: string, description: string) {
  if (!milestoneId) return { success: false, error: "Milestone ID is required." };
  if (!description || description.trim().length === 0) {
    return { success: false, error: "Submission description is required." };
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  const { error } = await supabase.rpc("submit_milestone", {
    p_milestone_id: milestoneId,
    p_description: description,
  });

  if (error) {
    console.error("RPC submit_milestone failed:", error);
    return { success: false, error: error.message || "Failed to submit milestone." };
  }

  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id")
    .eq("id", milestoneId)
    .single();

  if (milestone) {
    revalidatePath(`/projects/${milestone.project_id}`);
    revalidatePath(`/freelancer/milestones/${milestoneId}`);
    revalidatePath("/dashboard");
  }

  return { success: true };
}

/**
 * Server Action for client to approve milestone and release payment.
 */
export async function approveMilestoneAction(milestoneId: string) {
  if (!milestoneId) return { success: false, error: "Milestone ID is required." };

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // Idempotency: first check if it's already paid/approved
  const { data: milestoneCheck } = await supabase
    .from("milestones")
    .select("status, project_id")
    .eq("id", milestoneId)
    .single();

  if (milestoneCheck && (milestoneCheck.status === "PAID" || milestoneCheck.status === "APPROVED")) {
    return { success: true, alreadyPaid: true };
  }

  const { error } = await supabase.rpc("release_milestone_payment", {
    p_milestone_id: milestoneId,
    p_is_auto_release: false,
  });

  if (error) {
    console.error("RPC release_milestone_payment failed:", error);
    return { success: false, error: error.message || "Failed to approve milestone payment." };
  }

  if (milestoneCheck) {
    revalidatePath(`/projects/${milestoneCheck.project_id}`);
    revalidatePath(`/freelancer/milestones/${milestoneId}`);
    revalidatePath("/wallet");
    revalidatePath("/dashboard");
  }

  return { success: true };
}

/**
 * Server Action to open a dispute.
 */
export async function openDisputeAction(milestoneId: string, reason: string, description: string = "") {
  if (!milestoneId) return { success: false, error: "Milestone ID is required." };
  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "Dispute reason is required." };
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  const { error } = await supabase.rpc("dispute_milestone", {
    p_milestone_id: milestoneId,
    p_reason: reason,
    p_description: description,
  });

  if (error) {
    console.error("RPC dispute_milestone failed:", error);
    return { success: false, error: error.message || "Failed to open dispute." };
  }

  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id")
    .eq("id", milestoneId)
    .single();

  if (milestone) {
    revalidatePath(`/projects/${milestone.project_id}`);
    revalidatePath(`/freelancer/milestones/${milestoneId}`);
    revalidatePath("/dashboard");
  }

  return { success: true };
}

