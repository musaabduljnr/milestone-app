"use server";

import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Server Action to verify or decline a user's KYC verification status.
 */
export async function verifyUserAction(userId: string, status: "pending" | "verified") {
  if (!userId || !status) {
    return { success: false, error: "User ID and verification status are required." };
  }

  const supabase = await createClient();

  try {
    // 1. Verify admin permissions
    await assertAdmin(supabase);

    // 2. Call DB RPC to update status securely
    const { error } = await supabase.rpc("admin_verify_user", {
      p_user_id: userId,
      p_status: status,
    });

    if (error) {
      console.error("RPC admin_verify_user failed:", error);
      return { success: false, error: error.message || "Failed to update user verification status." };
    }

    revalidatePath("/admin/verifications");
    revalidatePath("/admin/users");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("verifyUserAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error." };
  }
}

/**
 * Server Action to resolve a payment dispute.
 */
export async function resolveDisputeAction(
  disputeId: string,
  outcome: "CLIENT_FAVORED" | "FREELANCER_FAVORED" | "PARTIAL_RESOLUTION",
  resolutionNote: string,
  clientAmount: number,
  freelancerAmount: number
) {
  if (!disputeId || !outcome || !resolutionNote) {
    return { success: false, error: "Dispute ID, outcome, and resolution note are required." };
  }

  const supabase = await createClient();

  try {
    // 1. Verify admin permissions
    await assertAdmin(supabase);

    // 2. Call DB RPC to resolve the dispute securely
    const { error } = await supabase.rpc("resolve_dispute_secure", {
      p_dispute_id: disputeId,
      p_outcome: outcome,
      p_resolution_note: resolutionNote,
      p_client_amount: clientAmount,
      p_freelancer_amount: freelancerAmount,
    });

    if (error) {
      console.error("RPC resolve_dispute_secure failed:", error);
      return { success: false, error: error.message || "Failed to resolve dispute." };
    }

    revalidatePath("/admin/disputes");
    revalidatePath("/admin/projects");
    revalidatePath("/admin/milestones");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("resolveDisputeAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error." };
  }
}

/**
 * Server Action to save AI provider configuration to the database.
 */
export async function saveAIConfigAction(config: {
  provider: "gemini" | "openai" | "mock";
  model: string;
  fallbackProvider: "gemini" | "openai" | "mock" | "none";
  timeout: number;
}) {
  if (!config || !config.provider || !config.model) {
    return { success: false, error: "Provider and model configurations are required." };
  }

  const supabase = await createClient();

  try {
    // 1. Verify admin permissions
    await assertAdmin(supabase);

    // 2. Persist config in the system_config table
    const { error } = await supabase
      .from("system_config")
      .upsert({
        key: "ai_config",
        value: config,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to save AI config:", error);
      return { success: false, error: error.message || "Failed to save AI settings." };
    }

    revalidatePath("/admin/ai");
    return { success: true };
  } catch (err) {
    console.error("saveAIConfigAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error." };
  }
}

/**
 * Server Action to retrieve AI configuration settings.
 * Falls back to environment variables if not defined in the database.
 */
export async function getAIConfigAction() {
  const supabase = await createClient();

  try {
    // 1. Check if admin
    await assertAdmin(supabase);

    // 2. Fetch config from database
    const { data, error } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "ai_config")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data && data.value) {
      return { success: true, config: data.value };
    }

    // 3. Fallback to server-side environment variables
    const fallbackConfig = {
      provider: (process.env.AI_PROVIDER || "mock") as "gemini" | "openai" | "mock",
      model: process.env.AI_MODEL || (process.env.AI_PROVIDER === "openai" ? "gpt-4o" : "gemini-2.5-flash"),
      fallbackProvider: "none" as "gemini" | "openai" | "mock" | "none",
      timeout: 10000,
    };

    return { success: true, config: fallbackConfig };
  } catch (err) {
    console.error("getAIConfigAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error." };
  }
}

/**
 * Server Action to save generic system configuration settings.
 */
export async function saveSettingsAction(settings: Record<string, unknown>) {
  const supabase = await createClient();

  try {
    await assertAdmin(supabase);

    const { error } = await supabase
      .from("system_config")
      .upsert({
        key: "system_settings",
        value: settings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to save settings:", error);
      return { success: false, error: error.message || "Failed to save platform settings." };
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err) {
    console.error("saveSettingsAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error." };
  }
}

/**
 * Server Action to retrieve generic system settings.
 */
export async function getSettingsAction() {
  const supabase = await createClient();

  try {
    await assertAdmin(supabase);

    const { data, error } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "system_settings")
      .maybeSingle();

    if (error) {
      throw error;
    }

    const defaultSettings = {
      enableRegistration: true,
      enableEscrowFunding: true,
      requireKycBeforeMilestone: true,
      simulatedLedgerLimit: 50000,
    };

    return { success: true, settings: data?.value || defaultSettings };
  } catch (err) {
    console.error("getSettingsAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error." };
  }
}
