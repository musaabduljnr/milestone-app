"use server";

import { createClient } from "@/lib/supabase/server";
import { AIService } from "@/lib/ai/service";
import { MilestoneSuggestion, StatusUpdateDraft, ScopeCreepAnalysis } from "@/lib/ai/types";
import { ScopeCreepContext } from "@/lib/ai/prompts/scope-creep";

/**
 * Type-safe interface response format for Server Actions.
 */
export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Internal helper to verify project ownership or membership.
 */
async function verifyProjectAccess(projectId: string): Promise<{ success: boolean; project?: { title: string; description: string; budget: number }; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // Fetch project details
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, description, budget, client_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { success: false, error: "Project not found or inaccessible." };
  }

  // Case A: User is the project owner (client)
  if (project.client_id === user.id) {
    return { success: true, project: { title: project.title, description: project.description || "", budget: project.budget } };
  }

  // Case B: User is an invited member (client/freelancer)
  const { data: member } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return { success: false, error: "Unauthorized: You do not have access to this project's resources." };
  }

  return { success: true, project: { title: project.title, description: project.description || "", budget: project.budget } };
}



/**
 * 1. Server Action: Generate a suggested 3-milestone breakdown for a project.
 */
export async function getMilestoneBreakdownAction(projectId: string): Promise<ActionResponse<MilestoneSuggestion[]>> {
  try {
    const authCheck = await verifyProjectAccess(projectId);
    if (!authCheck.success || !authCheck.project) {
      return { success: false, error: authCheck.error };
    }

    const suggestions = await AIService.getMilestoneBreakdown(
      authCheck.project.title,
      authCheck.project.description,
      authCheck.project.budget
    );

    return { success: true, data: suggestions };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI assistance is temporarily unavailable.";
    return { success: false, error: message };
  }
}

/**
 * 2. Server Action: Draft a professional progress update status draft for a freelancer.
 */
export async function draftStatusUpdateAction(
  milestoneId: string,
  updateInput: string
): Promise<ActionResponse<StatusUpdateDraft>> {
  // 1. Validate the input
  if (!updateInput || !updateInput.trim()) {
    return { success: false, error: "Freelancer progress notes are required to generate a draft." };
  }

  // 2. Prevent excessively large input (truncate to 2000 characters)
  if (updateInput.length > 2000) {
    updateInput = updateInput.substring(0, 2000);
  }

  const supabase = await createClient();

  // 3. Authenticate the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // 4. Fetch the milestone and confirm it belongs to a project
  const { data: milestone, error: milestoneError } = await supabase
    .from("milestones")
    .select("id, title, description, project_id, assigned_freelancer_id")
    .eq("id", milestoneId)
    .single();

  if (milestoneError || !milestone || !milestone.project_id) {
    // Return a safe error and do not reveal details of other users' milestones
    return { success: false, error: "Milestone not found or access denied." };
  }

  // 5. Confirm user profile role is freelancer
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer") {
    return { success: false, error: "Unauthorized: Only freelancer accounts can generate status updates." };
  }

  // 6. Confirm the authenticated user is the freelancer assigned to that milestone
  if (milestone.assigned_freelancer_id !== user.id) {
    return { success: false, error: "Unauthorized: You are not assigned to this milestone." };
  }

  try {
    // 7. Call the existing AIService
    const draft = await AIService.getStatusUpdateDraft(
      milestone.title,
      milestone.description || "",
      updateInput
    );

    return { success: true, data: draft };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI assistance is temporarily unavailable.";
    return { success: false, error: message };
  }
}

/**
 * 3. Server Action: Compare proposed changes against the project parameters to evaluate scope creep.
 */
export async function detectScopeCreepAction(
  projectId: string,
  proposedTitle: string,
  proposedDesc: string
): Promise<ActionResponse<ScopeCreepAnalysis>> {
  // 1. Validate input fields
  if (!proposedTitle || !proposedTitle.trim() || !proposedDesc || !proposedDesc.trim()) {
    return { success: false, error: "Proposed milestone title and description are required for scope auditing." };
  }

  const supabase = await createClient();

  // 2. Authenticate the user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // 3. Fetch project details and verify ownership/membership
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, description, category, budget, client_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { success: false, error: "Project not found or access denied." };
  }

  const isOwner = project.client_id === user.id;
  let isMember = false;

  if (!isOwner) {
    const { data: member } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();
    if (member) {
      isMember = true;
    }
  }

  if (!isOwner && !isMember) {
    return { success: false, error: "Unauthorized: You do not have access to this project." };
  }

  // 4. Resolve user profile context
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { success: false, error: "User profile context not found." };
  }

  // 5. Fetch minimum required project/milestone context
  const { data: milestones } = await supabase
    .from("milestones")
    .select("title, description")
    .eq("project_id", projectId);

  try {
    const ctx: ScopeCreepContext = {
      projectTitle: project.title,
      projectDesc: project.description || "",
      projectCategory: project.category || "General",
      projectBudget: Number(project.budget),
      existingMilestones: (milestones || []).map((m) => ({
        title: m.title,
        description: m.description,
      })),
      proposedTitle,
      proposedDesc,
    };

    // 6. Call AIService
    const analysis = await AIService.analyzeScopeCreep(ctx);

    // 7. Return validated structured data
    return { success: true, data: analysis };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI assistance is temporarily unavailable.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Generate a suggested 3-milestone breakdown prior to project database record creation.
 */
export async function generateMilestoneBreakdownAction(input: {
  title: string;
  description: string;
  category: string;
  budget: number;
  expectedCompletionDate: string;
}): Promise<ActionResponse<MilestoneSuggestion[]>> {
  const { title, description, budget } = input;

  // 1. Validate basic input fields
  if (!title || !title.trim()) {
    return { success: false, error: "Project title is required." };
  }
  if (!description || description.trim().length < 20) {
    return { success: false, error: "Add a little more detail about what you want to build." };
  }
  if (budget <= 0) {
    return { success: false, error: "Total project budget must be greater than 0." };
  }

  const supabase = await createClient();

  // 2. Authenticate the current session user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // 3. Verify that the user has the 'client' role in database profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "User profile context not found." };
  }

  if (profile.role !== "client") {
    return { success: false, error: "Unauthorized: Only client accounts can request milestone suggestions." };
  }

  try {
    // 4. Call the existing AI Service Layer
    const suggestions = await AIService.getMilestoneBreakdown(title, description, budget);
    return { success: true, data: suggestions };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI assistance is temporarily unavailable.";
    return { success: false, error: message };
  }
}
