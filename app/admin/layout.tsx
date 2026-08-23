import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/supabase/admin";
import { signOutAction } from "@/app/auth/actions";
import { AdminShell } from "@/components/layout/AdminShell";

export interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient();

  // 1. Get authenticated user (middleware guarantees this is not null for /admin routes)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?returnUrl=/admin");
  }

  // 2. Check if admin table is empty (first-time setup)
  const { count: adminCount } = await supabase
    .from("system_admins")
    .select("*", { count: "exact", head: true });

  if (adminCount === 0) {
    redirect("/admin-setup");
  }

  // 3. Query system admin privileges for current user
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) {
    redirect("/dashboard?error=Access restricted to platform administrators.");
  }

  // 4. Fetch admin profile details
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "AD";

  return (
    <AdminShell
      userName={profile?.full_name || "Platform Admin"}
      userEmail={profile?.email || user.email || ""}
      userInitials={initials}
      userAvatarUrl={profile?.avatar_url || undefined}
      onSignOut={signOutAction}
    >
      {children}
    </AdminShell>
  );
}
