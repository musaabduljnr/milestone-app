import { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createAdminClient } from "./server";

/**
 * Checks if the authenticated user has admin privileges by checking the admin_session cookie
 * and validating it against the database.
 */
export async function checkIsAdmin(supabase?: SupabaseClient): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) {
    return false;
  }

  try {
    const client = supabase || (await createAdminClient());
    const { data, error } = await client.rpc("validate_admin_session", {
      p_token: token,
    });

    if (error || !data || data.length === 0) {
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error verifying admin session in checkIsAdmin:", err);
    return false;
  }
}

/**
 * Retrieves the currently logged-in admin's profile information.
 */
export async function getAdminProfile(supabase?: SupabaseClient): Promise<{ id: string; email: string; full_name: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) {
    return null;
  }

  try {
    const client = supabase || (await createAdminClient());
    const { data, error } = await client.rpc("validate_admin_session", {
      p_token: token,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const admin = data[0];
    return {
      id: admin.admin_id,
      email: admin.email,
      full_name: admin.full_name,
    };
  } catch (err) {
    console.error("Error retrieving admin profile:", err);
    return null;
  }
}

/**
 * Asserts that the authenticated user is an admin.
 * Throws an error if they are not.
 */
export async function assertAdmin(supabase?: SupabaseClient): Promise<void> {
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) {
    throw new Error("Access denied: Administrator privileges required.");
  }
}

