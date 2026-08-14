import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signOutAction } from "@/app/auth/actions";

export default async function NotFound() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const errorCard = (
    <Card className="w-full max-w-md p-8 flex flex-col items-center gap-5 text-center bg-surface border border-outline-variant/35 shadow-modal">
      <div className="w-14 h-14 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-primary select-none">
        <span className="material-symbols-outlined text-[32px]">warning</span>
      </div>
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">404 - Route Not Found</h2>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          The requested page route does not exist or has been relocated to another workspace.
        </p>
      </div>
      <Link href="/dashboard" className="w-full">
        <Button variant="primary" className="w-full">
          Return to Dashboard
        </Button>
      </Link>
    </Card>
  );

  if (user && profile && profile.role) {
    const initials = profile.full_name
      ? profile.full_name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
      : "";

    return (
      <AppShell
        activeRole={profile.role}
        activeMenuLabel="Error"
        userName={profile.full_name}
        userEmail={user.email || ""}
        userInitials={initials}
        userAvatarUrl={profile.avatar_url || undefined}
        onSignOut={signOutAction}
      >
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          {errorCard}
        </div>
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans">
      {errorCard}
    </div>
  );
}
