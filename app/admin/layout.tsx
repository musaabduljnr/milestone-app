import React from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { checkIsAdmin, getAdminProfile } from "@/lib/supabase/admin";
import { adminLogoutAction } from "@/app/admin/actions";
import { AdminShell } from "@/components/layout/AdminShell";

export interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // 1. Diagnostics check for local development
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 select-none font-sans">
        <div className="w-full max-w-lg bg-surface border border-error/20 rounded-2xl p-8 flex flex-col gap-6 shadow-lg animate-fade-in">
          <div className="flex items-center gap-4 text-error">
            <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px]">
                warning
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-on-surface">Configuration Required</h1>
              <p className="text-xs text-secondary mt-0.5">Admin Portal Configuration Error</p>
            </div>
          </div>

          <div className="h-px bg-outline-variant/60" />

          <div className="flex flex-col gap-3">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              The platform administrative portal requires the <strong>Supabase Service Role Key</strong> to bypass Row Level Security (RLS) policies and compile administrative audit logs.
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Please configure the key in your local environment file:
            </p>
            
            <div className="bg-surface-container-high border border-outline-variant/40 rounded-xl p-4 font-mono text-xs text-secondary-custom select-all overflow-x-auto whitespace-pre">
              # .env.local{`\n`}SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
            </div>
            
            <p className="text-[11px] text-secondary leading-relaxed">
              You can find your <code>service_role</code> key inside your Supabase Dashboard under <strong>Project Settings &gt; API &gt; Project API Keys</strong>. Keep this key strictly secret.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              Open Supabase Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createAdminClient();

  // 2. Check if admin setup is required (first-time setup)
  const { data: setupRequired, error: checkError } = await supabase.rpc("is_admin_setup_required");

  if (checkError) {
    console.error("Failed to check if admin setup is required:", checkError);
  }

  if (setupRequired) {
    redirect("/admin-setup");
  }

  // 3. Verify admin session cookie is valid
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) {
    redirect("/admin-login");
  }

  // 4. Retrieve current administrator profile
  const adminProfile = await getAdminProfile(supabase);
  if (!adminProfile) {
    // Session token is invalid or expired
    redirect("/admin-login");
  }

  const initials = adminProfile.full_name
    ? adminProfile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "AD";

  return (
    <AdminShell
      userName={adminProfile.full_name}
      userEmail={adminProfile.email}
      userInitials={initials}
      onSignOut={adminLogoutAction}
    >
      {children}
    </AdminShell>
  );
}
