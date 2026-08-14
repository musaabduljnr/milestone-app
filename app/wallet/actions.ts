"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Top up simulated wallet balance (sandbox development only).
 */
export async function topUpSimulatedFunds(amount: number) {
  if (amount <= 0 || amount > 100000) {
    return { success: false, error: "Top-up size must be between $1 and $100,000" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthenticated request" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client") {
    return { success: false, error: "Only Client accounts can top up simulated funds." };
  }

  const { error } = await supabase.rpc("add_simulated_funds", {
    p_amount: amount,
  });

  if (error) {
    console.error("Top-up RPC execution failed:", error);
    return { success: false, error: error.message || "Top-up operation failed." };
  }

  revalidatePath("/wallet");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Server Action executing atomic project funding transaction.
 */
export async function fundProjectAction(projectId: string) {
  if (!projectId) {
    return { success: false, error: "Project ID is required" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // Invoke secure locking plpgsql function
  const { error } = await supabase.rpc("fund_project", {
    p_project_id: projectId,
  });

  if (error) {
    console.error("Project funding RPC transaction failed:", error);
    return {
      success: false,
      error: error.message || "Funding failed. Verify you have sufficient wallet balance.",
    };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/wallet");
  revalidatePath("/dashboard");
  return { success: true };
}
