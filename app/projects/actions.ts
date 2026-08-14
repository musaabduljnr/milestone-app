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
  }[];
}

/**
 * Fetch registered freelancers.
 */
export async function getFreelancers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("role", "freelancer");

  if (error) {
    console.error("Error fetching freelancers list:", error);
    return [];
  }

  return data || [];
}

/**
 * Server Action creating project and milestones atomically.
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

  // 5. Invoke atomic database RPC transaction
  const { data: projectId, error: rpcError } = await supabase.rpc(
    "create_project_with_milestones",
    {
      p_title: title,
      p_description: description,
      p_category: category,
      p_budget: budget,
      p_currency: currency,
      p_expected_completion: expected_completion,
      p_milestones: milestones,
    }
  );

  if (rpcError) {
    console.error("RPC creation transaction failed:", rpcError);
    return { success: false, error: rpcError.message || "Failed to create project database records." };
  }

  return { success: true, projectId };
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

