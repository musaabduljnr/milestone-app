"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server Action to save user's verification details: full name and date of birth.
 */
export async function saveVerificationDetails(fullName: string, dob: string) {
  if (!fullName || !fullName.trim()) {
    return { success: false, error: "Full name is required." };
  }
  if (!dob) {
    return { success: false, error: "Date of birth is required." };
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      date_of_birth: dob,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error saving verification details:", error);
    return { success: false, error: error.message || "Failed to update profile info." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/wallet");
  return { success: true };
}

/**
 * Server Action to associate uploaded photo ID storage path.
 */
export async function associateVerificationDocument(photoIdPath: string) {
  if (!photoIdPath) {
    return { success: false, error: "Photo ID path is required." };
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      photo_id_path: photoIdPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error associating verification document:", error);
    return { success: false, error: error.message || "Failed to associate document reference." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/wallet");
  return { success: true };
}

/**
 * Server Action to execute the start of the mock verification lifecycle.
 * Transitions user's verification_status from pending/unverified to pending.
 */
export async function startMockVerificationAction() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // Invoke secure plpgsql function start_mock_verification
  const { error } = await supabase.rpc("start_mock_verification");

  if (error) {
    console.error("Error executing start_mock_verification:", error);
    return { success: false, error: error.message || "Verification check failed. Please verify your profile info." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/wallet");
  revalidatePath("/verification");
  return { success: true };
}

/**
 * Server Action to finalize the mock verification status to verified.
 * Transition verification_status from pending to verified.
 */
export async function completeMockVerificationAction() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please sign in." };
  }

  // Invoke secure plpgsql function complete_mock_verification
  const { error } = await supabase.rpc("complete_mock_verification");

  if (error) {
    console.error("Error executing complete_mock_verification:", error);
    return { success: false, error: error.message || "Verification completion failed." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/wallet");
  revalidatePath("/verification");
  return { success: true };
}
