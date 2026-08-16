import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { getInvitationDetailsAction } from "@/app/projects/actions";
import InvitationDetailClient from "./InvitationDetailClient";

export interface InvitationPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?returnUrl=/invitations/${id}`);
  }

  // 2. Fetch authenticated profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url, verification_status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  if (profile.role !== "freelancer") {
    return (
      <AppShell
        activeRole={profile.role || "client"}
        userName={profile.full_name || user.email || ""}
        userEmail={user.email || ""}
        onSignOut={signOutAction}
      >
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <Card className="w-full max-w-md p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-error-container/20 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">lock</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Access Restricted
            </h2>
            <p className="text-sm text-muted-foreground">
              Only freelancer accounts can view and respond to project milestone invitations.
            </p>
            <Link href="/dashboard" className="mt-2">
              <Button variant="primary" size="sm">
                Go to Dashboard
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  // 3. Fetch invitation details
  const res = await getInvitationDetailsAction(id);

  if (!res.success || !res.invitation) {
    return (
      <AppShell
        activeRole="freelancer"
        userName={profile.full_name || user.email || ""}
        userEmail={user.email || ""}
        onSignOut={signOutAction}
      >
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <Card className="w-full max-w-md p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">mail</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Invitation Not Found
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {res.error || "This invitation does not exist or has expired."}
            </p>
            <Link href="/dashboard" className="mt-2">
              <Button variant="primary" size="sm">
                Back to Dashboard
              </Button>
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeRole="freelancer"
      activeMenuLabel="Overview"
      userName={profile.full_name || user.email || ""}
      userEmail={user.email || ""}
      onSignOut={signOutAction}
    >
      <InvitationDetailClient
        invitation={res.invitation}
        currentUserId={user.id}
        profile={profile}
      />
    </AppShell>
  );
}
