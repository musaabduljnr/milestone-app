"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface MessageRecord {
  id: string;
  project_id: string;
  milestone_id: string | null;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  created_at: string;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Send a message in a project/milestone context and trigger a notification.
 */
export async function sendMessage(
  projectId: string,
  milestoneId: string | null,
  content: string
): Promise<ActionResponse<MessageRecord>> {
  if (!content || !content.trim()) {
    return { success: false, error: "Message content cannot be empty." };
  }

  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  try {
    // 2. Fetch project details and verify project membership
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, title, client_id")
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
      return { success: false, error: "Unauthorized: You are not a member of this project." };
    }

    // 3. Resolve target recipient
    let recipientId: string | null = null;
    if (isOwner) {
      // Client is sending: recipient is freelancer
      if (milestoneId) {
        const { data: milestone } = await supabase
          .from("milestones")
          .select("assigned_freelancer_id")
          .eq("id", milestoneId)
          .single();
        recipientId = milestone?.assigned_freelancer_id || null;
      }
      if (!recipientId) {
        // Fallback to first freelancer member in project_members
        const { data: member } = await supabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", projectId)
          .eq("role", "freelancer")
          .limit(1)
          .single();
        recipientId = member?.user_id || null;
      }
    } else {
      // Freelancer is sending: recipient is client owner
      recipientId = project.client_id;
    }

    // 4. Insert message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        project_id: projectId,
        milestone_id: milestoneId || undefined,
        sender_id: user.id,
        recipient_id: recipientId || undefined,
        content: content.trim(),
      })
      .select()
      .single();

    if (messageError || !message) {
      throw new Error(messageError?.message || "Failed to save message.");
    }

    // 5. Send notification to the recipient
    if (recipientId) {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const senderName = senderProfile?.full_name || "Someone";
      const milestoneContext = milestoneId ? "milestone" : "project";

      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "NEW_MESSAGE",
        title: `New chat from ${senderName}`,
        message: `"${content.trim().substring(0, 50)}${content.length > 50 ? "..." : ""}" in ${milestoneContext} chat.`,
        project_id: projectId,
        milestone_id: milestoneId || undefined,
      });
    }

    // Revalidate relevant pages
    revalidatePath(`/projects/${projectId}`);
    if (milestoneId) {
      revalidatePath(`/freelancer/milestones/${milestoneId}`);
    }

    const typedMessage: MessageRecord = {
      id: message.id,
      project_id: message.project_id,
      milestone_id: message.milestone_id || null,
      sender_id: message.sender_id,
      recipient_id: message.recipient_id || null,
      content: message.content,
      created_at: message.created_at,
    };

    return { success: true, data: typedMessage };
  } catch (err: unknown) {
    console.error("sendMessage Action Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to send message." };
  }
}

/**
 * Server Action: Get recent notifications for the logged-in user.
 */
export async function getNotifications(): Promise<ActionResponse<Record<string, unknown>[]>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    const records = (data || []) as unknown as Record<string, unknown>[];
    return { success: true, data: records };
  } catch (err: unknown) {
    console.error("getNotifications Action Error:", err);
    return { success: false, error: "Failed to fetch notifications." };
  }
}

/**
 * Server Action: Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<ActionResponse<Record<string, unknown>>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    const record = data as unknown as Record<string, unknown>;
    return { success: true, data: record };
  } catch (err: unknown) {
    console.error("markNotificationRead Action Error:", err);
    return { success: false, error: "Failed to update notification status." };
  }
}

/**
 * Server Action: Mark all unread notifications of the user as read.
 */
export async function markAllNotificationsRead(): Promise<ActionResponse<Record<string, unknown>[]>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  try {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null)
      .select();

    if (error) throw error;
    const records = (data || []) as unknown as Record<string, unknown>[];
    return { success: true, data: records };
  } catch (err: unknown) {
    console.error("markAllNotificationsRead Action Error:", err);
    return { success: false, error: "Failed to mark all notifications as read." };
  }
}
