import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import FreelancerMilestoneClient from "./FreelancerMilestoneClient";

export interface FreelancerMilestonePageProps {
  params: Promise<{ id: string }>;
}

export default async function FreelancerMilestonePage({ params }: FreelancerMilestonePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Resolve user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 2. Fetch authenticated profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url, verification_status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  // 3. Fetch milestone details
  const { data: milestone, error: milestoneError } = await supabase
    .from("milestones")
    .select("*")
    .eq("id", id)
    .single();

  if (milestoneError || !milestone) {
    return (
      <AppShell
        activeRole={profile.role || "freelancer"}
        userName={profile.full_name || ""}
        onSignOut={signOutAction}
      >
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <Card className="w-full max-w-md p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-error-container/20 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">lock</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Milestone Not Found
            </h2>
            <p className="text-sm text-muted-foreground">
              This milestone does not exist or you do not have permission to view it.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  // 4. Verify assignee is the logged-in user
  if (milestone.assigned_freelancer_id !== user.id) {
    return (
      <AppShell
        activeRole={profile.role || "freelancer"}
        userName={profile.full_name || ""}
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
              You are not the assigned freelancer for this milestone.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  // 5. Fetch project details
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", milestone.project_id)
    .single();

  if (!project) {
    redirect("/dashboard");
  }

  // 6. Fetch client details
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", project.client_id)
    .single();

  // 7. Fetch disputes if any
  const { data: dispute } = await supabase
    .from("disputes")
    .select("*")
    .eq("milestone_id", id)
    .eq("status", "OPEN")
    .single();

  return (
    <FreelancerMilestoneClient
      profile={profile}
      userEmail={user.email || ""}
      milestone={milestone}
      project={project}
      clientName={clientProfile?.full_name || "Client"}
      dispute={dispute}
    />
  );
}
