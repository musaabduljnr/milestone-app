"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileSettings(fullName: string, avatarUrl: string) {
  if (!fullName || !fullName.trim()) {
    return { success: false, error: "Display name is required." };
  }

  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthenticated request." };
  }

  // 2. Perform DB update
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName.trim(),
      avatar_url: avatarUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile settings:", error);
    return { success: false, error: error.message || "Failed to update profile settings." };
  }

  // Revalidate relevant pages
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/milestones");
  revalidatePath("/messages");
  revalidatePath("/activity");
  revalidatePath("/settings");

  return { success: true };
}
