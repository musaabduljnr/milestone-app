"use client";

import React from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminSetupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [isClaiming, setIsClaiming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

  // Verify the user is logged in
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string; email?: string } | null } }) => {
      if (!user) {
        router.replace("/auth/login?returnUrl=/admin/setup");
      } else {
        setUserEmail(user.email || null);
        setCheckingSession(false);
      }
    });
  }, [supabase, router]);

  const handleClaimAdmin = async () => {
    setIsClaiming(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc("claim_first_admin");

      if (rpcError) {
        setError(rpcError.message);
        setIsClaiming(false);
        return;
      }

      // Success — redirect to admin dashboard
      router.replace("/admin");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsClaiming(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
            progress_activity
          </span>
          <span className="text-secondary text-sm">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col gap-8 animate-fade-in">

        {/* Logo / Brand header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-primary-foreground text-[32px]">
              shield_person
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              Admin First Setup
            </h1>
            <p className="text-secondary text-sm mt-1">
              No administrator account exists yet.
            </p>
          </div>
        </div>

        {/* Setup card */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-6 flex flex-col gap-5 shadow-sm">

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
              Your Account
            </span>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant/40">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {(userEmail || "A")[0].toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-on-surface truncate">
                {userEmail}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 flex gap-3">
            <span className="material-symbols-outlined text-warning text-[18px] shrink-0 mt-0.5">
              info
            </span>
            <p className="text-xs text-secondary leading-relaxed">
              Clicking <strong className="text-on-surface">Claim Admin Access</strong> will register your account as the platform administrator. This action can only be performed once — when no other administrator exists.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-error/5 border border-error/20 flex gap-2 items-start">
              <span className="material-symbols-outlined text-error text-[16px] shrink-0 mt-0.5">
                error
              </span>
              <p className="text-xs text-error leading-relaxed">{error}</p>
            </div>
          )}

          <button
            onClick={handleClaimAdmin}
            disabled={isClaiming}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isClaiming ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                Claiming Admin Access...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">
                  admin_panel_settings
                </span>
                Claim Admin Access
              </>
            )}
          </button>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Once claimed, additional admins can only be added manually via the database.
            Keep your credentials secure.
          </p>
        </div>

      </div>
    </div>
  );
}
