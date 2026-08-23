import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks if the authenticated user has admin privileges by looking up
 * their ID in the system_admins table.
 */
export async function checkIsAdmin(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return false;
  }

  const { data, error } = await supabase
    .from("system_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Asserts that the authenticated user is an admin.
 * Throws an error if they are not.
 */
export async function assertAdmin(supabase: SupabaseClient): Promise<void> {
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) {
    throw new Error("Access denied: Administrator privileges required.");
  }
}
