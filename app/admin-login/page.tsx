import React from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { checkIsAdmin } from "@/lib/supabase/admin";
import { AdminLoginForm } from "./AdminLoginForm";

export const revalidate = 0;

export default async function AdminLoginPage() {
  const supabase = await createAdminClient();

  // 1. If admin table is empty, redirect to setup
  const { data: setupRequired, error: checkError } = await supabase.rpc("is_admin_setup_required");

  if (checkError) {
    console.error("Error checking setup requirement:", checkError);
  }

  if (setupRequired) {
    redirect("/admin-setup");
  }

  // 2. If already logged in, redirect to dashboard
  const isAdmin = await checkIsAdmin(supabase);
  if (isAdmin) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 select-none font-sans relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      {/* Decorative gradient blur elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] flex flex-col gap-8 z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg transition-transform hover:scale-105 duration-300">
            <span className="material-symbols-outlined text-[28px] font-bold">
              shield_person
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              Milestone Admin
            </h1>
            <p className="text-secondary text-xs mt-1">
              Enter credentials to access platform operations
            </p>
          </div>
        </div>

        {/* Login form container */}
        <div className="bg-surface/85 backdrop-blur-xl border border-outline-variant/60 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
          <AdminLoginForm />
        </div>

        {/* Back Link */}
        <p className="text-center text-xs text-secondary leading-relaxed">
          Not an administrator?{" "}
          <a href="/dashboard" className="text-primary font-bold hover:underline transition-all">
            Return to Dashboard
          </a>
        </p>

      </div>
    </div>
  );
}
