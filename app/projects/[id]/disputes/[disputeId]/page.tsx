import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import React from "react";
import Link from "next/link";
import { DisputeDetailClient } from "./DisputeDetailClient";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface PageProps {
  params: Promise<{
    id: string;
    disputeId: string;
  }>;
}

export default async function DisputeDetailPage({ params }: PageProps) {
  const { id: projectId, disputeId } = await params;
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/auth/login");
  }

  // 2. Fetch current user profile first to wrap error screens in AppShell
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, verification_status")
    .eq("id", user.id)
    .single();

  if (!currentUserProfile) {
    redirect("/auth/login");
  }

  // Intercept role bypasses
  if (!currentUserProfile.role) {
    redirect("/auth/role-selection");
  }

  const initials = currentUserProfile.full_name
    ? currentUserProfile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "";

  // Helper to render errors inside the AppShell layout framework
  const renderErrorState = (title: string, message: string, icon: string) => (
    <AppShell
      activeRole={currentUserProfile.role as "client" | "freelancer"}
      activeMenuLabel="Overview"
      userName={currentUserProfile.full_name}
      userEmail={user.email || ""}
      userInitials={initials}
      userAvatarUrl={currentUserProfile.avatar_url || undefined}
      onSignOut={signOutAction}
    >
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
        <Card className="w-full max-w-md p-8 flex flex-col items-center gap-5 border-outline-variant/35 shadow-modal">
          <div className="w-14 h-14 rounded-full bg-error-container/10 border border-error/25 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[32px]">{icon}</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{title}</h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {message}
            </p>
          </div>
          <Link href="/dashboard" className="w-full">
            <Button variant="primary" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    </AppShell>
  );

  // 3. Fetch project details
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id, currency, status")
    .eq("id", projectId)
    .single();

  if (!project) {
    return renderErrorState(
      "Project Not Found",
      "The contract workspace you are trying to access does not exist or has been archived.",
      "folder_open"
    );
  }

  // 4. Verify project membership
  let isMember = project.client_id === user.id;
  if (!isMember) {
    const { data: member } = await supabase
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();
    isMember = !!member;
  }

  if (!isMember) {
    return renderErrorState(
      "Access Restricted",
      "You are not a registered participant of this contract. Only project team members are authorized to review dispute files.",
      "lock"
    );
  }

  // 5. Fetch dispute details
  const { data: dispute } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", disputeId)
    .single();

  if (!dispute) {
    return renderErrorState(
      "Dispute Not Found",
      "The requested dispute transaction file was not found in the platform database logs.",
      "gavel"
    );
  }

  // 6. Fetch milestone details
  const { data: milestone } = await supabase
    .from("milestones")
    .select("id, title, payout_amount, status, assigned_freelancer_id")
    .eq("id", dispute.milestone_id)
    .single();

  if (!milestone) {
    return renderErrorState(
      "Milestone Not Found",
      "The milestone phase associated with this dispute details log has been removed or is inaccessible.",
      "assignment_turned_in"
    );
  }

  // Fetch trust profiles (Client + Freelancer)
  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, verification_verified_at")
    .eq("id", project.client_id)
    .single();

  const { data: freelancerProfile } = milestone.assigned_freelancer_id
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, verification_verified_at")
        .eq("id", milestone.assigned_freelancer_id)
        .single()
    : { data: null };

  // Fetch attachments (evidence files) linked to this dispute
  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: false });

  return (
    <DisputeDetailClient
      project={project}
      dispute={dispute}
      milestone={milestone}
      currentUser={currentUserProfile}
      clientProfile={clientProfile}
      freelancerProfile={freelancerProfile}
      initialAttachments={attachments || []}
    />
  );
}
