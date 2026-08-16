"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Sign up action registering a user via email/password.
 * Copy metadata triggers copy name to profiles automatically.
 */
export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  if (!email || !password || !fullName) {
    redirect("/auth/signup?error=All fields are required");
  }

  if (password.length < 6) {
    redirect("/auth/signup?error=Password must be at least 6 characters");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`);
  }

  // Redirect to login screen with a success verification notice
  redirect("/auth/login?message=Registration successful! Please check your inbox and verify your email before logging in.");
}

/**
 * Sign in action validating credentials.
 */
export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/auth/login?error=Email and password are required");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  // Redirect to dashboard (middleware will route to role-selection if role is missing)
  redirect("/dashboard");
}

/**
 * Sign out action clearing session cookies.
 */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

/**
 * Sets the profile role for a newly registered user.
 * Role is an account-level identity and may only be set ONCE during onboarding.
 * Returns a result object — navigation is handled client-side.
 */
export async function selectRoleAction(role: "client" | "freelancer") {
  if (role !== "client" && role !== "freelancer") {
    return { success: false, error: "Invalid role choice" };
  }

  const supabase = await createClient();

  // Retrieve authenticated user info
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, redirect: "/auth/login" };
  }

  // Check if a role has already been set — role is immutable after onboarding
  const { data: existing } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (existing?.role) {
    // Role already set — do not allow switching
    revalidatePath("/", "layout");
    return { success: true, redirect: "/dashboard" };
  }

  // Persist the role for the first time
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  // Clear path cache to ensure fresh role is read on redirect
  revalidatePath("/", "layout");

  return { success: true, redirect: "/dashboard" };
}
