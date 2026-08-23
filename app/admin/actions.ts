"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { assertAdmin, checkIsAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "crypto";

// ==============================================================================
// Hashing Helpers (Secure Node.js pbkdf2 Hashing)
// ==============================================================================
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === testHash;
  } catch {
    return false;
  }
}

// ==============================================================================
// Admin Authentication Actions
// ==============================================================================

/**
 * Server Action to check if an admin session is active.
 * Used by client components (e.g. AppShell sidebar).
 */
export async function checkAdminSessionAction(): Promise<boolean> {
  return await checkIsAdmin();
}

/**
 * Server Action to register the first admin.
 * Only succeeds if the system_admins table is completely empty.
 */
export async function adminSetupAction(formData: Record<string, string>) {
  const email = formData.email?.trim();
  const fullName = formData.fullName?.trim();
  const password = formData.password;

  if (!email || !fullName || !password) {
    return { success: false, error: "All fields are required." };
  }

  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  const supabase = await createAdminClient();

  try {
    // 1. Verify if setup is indeed required
    const { data: setupRequired, error: checkError } = await supabase.rpc("is_admin_setup_required");
    if (checkError) {
      throw checkError;
    }

    if (!setupRequired) {
      return { success: false, error: "Admin portal is already initialized. Please login." };
    }

    // 2. Generate password hash
    const passwordHash = hashPassword(password);

    // 3. Register first admin via database RPC (security definer)
    const { data: sessionToken, error: registerError } = await supabase.rpc("register_first_admin", {
      p_email: email,
      p_full_name: fullName,
      p_password_hash: passwordHash,
    });

    if (registerError) {
      console.error("RPC register_first_admin failed:", registerError);
      return { success: false, error: registerError.message || "Registration failed." };
    }

    // 4. Set HTTP-only secure cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "admin_session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return { success: true };
  } catch (err) {
    console.error("adminSetupAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error." };
  }
}

/**
 * Server Action to log in an administrator.
 */
export async function adminLoginAction(formData: Record<string, string>) {
  const email = formData.email?.trim();
  const password = formData.password;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const supabase = await createAdminClient();

  try {
    // 1. Retrieve admin details by email
    const { data: admins, error: queryError } = await supabase.rpc("get_admin_by_email", {
      p_email: email,
    });

    if (queryError || !admins || admins.length === 0) {
      return { success: false, error: "Invalid email or password." };
    }

    const admin = admins[0];

    // 2. Verify password hash
    const isValid = verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return { success: false, error: "Invalid email or password." };
    }

    // 3. Create session via database RPC
    const { data: sessionToken, error: sessionError } = await supabase.rpc("create_admin_session", {
      p_admin_id: admin.id,
    });

    if (sessionError) {
      console.error("RPC create_admin_session failed:", sessionError);
      return { success: false, error: "Failed to create session." };
    }

    // 4. Set HTTP-only secure cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "admin_session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return { success: true };
  } catch (err) {
    console.error("adminLoginAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error." };
  }
}

/**
 * Server Action to log out the administrator.
 */
export async function adminLogoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;

  if (token) {
    try {
      const supabase = await createAdminClient();
      await supabase.rpc("delete_admin_session", { p_token: token });
    } catch (err) {
      console.error("Error deleting session on logout:", err);
    }
  }

  cookieStore.delete("admin_session");
  return { success: true };
}

// ==============================================================================
// Administrative Operation Actions
// ==============================================================================

/**
 * Server Action to verify or decline a user's KYC verification status.
 */
export async function verifyUserAction(userId: string, status: "pending" | "verified") {
  if (!userId || !status) {
    return { success: false, error: "User ID and verification status are required." };
  }

  const supabase = await createAdminClient();

  try {
    // 1. Verify admin permissions
    await assertAdmin(supabase);

    // 2. Fetch admin token from cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) {
      return { success: false, error: "Unauthorized: Admin session required." };
    }

    // 3. Call DB RPC to update status securely, passing the admin token
    const { error } = await supabase.rpc("admin_verify_user", {
      p_user_id: userId,
      p_status: status,
      p_admin_token: token,
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

  const supabase = await createAdminClient();

  try {
    // 1. Verify admin permissions
    await assertAdmin(supabase);

    // 2. Fetch admin token from cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) {
      return { success: false, error: "Unauthorized: Admin session required." };
    }

    // 3. Call DB RPC to resolve the dispute securely, passing the admin token
    const { error } = await supabase.rpc("resolve_dispute_secure", {
      p_dispute_id: disputeId,
      p_outcome: outcome,
      p_resolution_note: resolutionNote,
      p_client_amount: clientAmount,
      p_freelancer_amount: freelancerAmount,
      p_admin_token: token,
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

  const supabase = await createAdminClient();

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
 */
export async function getAIConfigAction() {
  const supabase = await createAdminClient();

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
  const supabase = await createAdminClient();

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
  const supabase = await createAdminClient();

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
