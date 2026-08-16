import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MilestoneStepper, MilestoneStep } from "@/components/milestone/MilestoneStepper";
import ProjectFundingWidget from "./ProjectFundingWidget";
import { ProjectMilestoneReview } from "@/components/milestone/ProjectMilestoneReview";
import ScopeCreepWidget from "./ScopeCreepWidget";
import Link from "next/link";
import { ProjectActivityTimeline } from "@/components/milestone/ProjectActivityTimeline";

export interface ProjectDetailProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
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
    .select("role, full_name, verification_status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  // 3. Fetch project details (protected by RLS)
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  // If RLS blocked, or project does not exist, show unauthorized state
  if (projectError || !project) {
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
              You are not a member of this project or do not have authorized permissions to view this contract details.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Fetch client available balance if current user is owner client
  const isOwner = project.client_id === user.id;
  let walletAvailable = 0;

  if (isOwner) {
    const { data: wallet } = await supabase
      .from("wallets")
      .select("available_balance")
      .eq("user_id", user.id)
      .single();
    walletAvailable = wallet ? Number(wallet.available_balance) : 0;
  }

  // 4. Fetch milestones
  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", id)
    .order("created_at");

  const milestonesList = milestones || [];

  // Fetch open disputes for milestones in this project
  const milestoneIds = milestonesList.map((m) => m.id);
  interface DisputeItem {
    id: string;
    milestone_id: string;
    reason: string;
    description: string | null;
    status: "OPEN" | "RESOLVED";
  }
  let disputesList: DisputeItem[] = [];
  if (milestoneIds.length > 0) {
    const { data: disputesData } = await supabase
      .from("disputes")
      .select("*")
      .in("milestone_id", milestoneIds)
      .eq("status", "OPEN");
    disputesList = (disputesData || []) as DisputeItem[];
  }

  const disputeMap = disputesList.reduce((acc, d) => {
    acc[d.milestone_id] = d;
    return acc;
  }, {} as Record<string, DisputeItem>);

  // 5. Fetch associated project members profiles to resolve assignees names
  const { data: members } = await supabase
    .from("project_members")
    .select("user_id, profiles(full_name, avatar_url)")
    .eq("project_id", id);

  const memberProfiles = (members || []).map((m) => {
    const rawProfile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    const profile = rawProfile as { full_name: string; avatar_url: string | null } | null;
    return {
      id: m.user_id,
      full_name: profile?.full_name || "Unknown User",
      avatar_url: profile?.avatar_url || null,
    };
  });

  // 6. Fetch pending invitations for this project
  const { data: projectInvitations } = await supabase
    .from("project_invitations")
    .select("id, milestone_id, invitee_email, status, invitee_user_id, profiles:invitee_user_id(full_name)")
    .eq("project_id", id)
    .eq("status", "PENDING");

  interface PendingInvItem {
    id: string;
    milestone_id: string;
    invitee_email: string;
    status: string;
    profiles?: { full_name: string } | { full_name: string }[] | null;
  }

  const pendingInvitationMap = ((projectInvitations || []) as unknown as PendingInvItem[]).reduce((acc, inv) => {
    acc[inv.milestone_id] = inv;
    return acc;
  }, {} as Record<string, PendingInvItem>);

  // 7. Map database milestone statuses to stepper status constraints
  const stepperSteps: MilestoneStep[] = milestonesList.map((m) => {
    let stepperStatus: MilestoneStep["status"] = "not_started";
    if (m.status === "PAID" || m.status === "APPROVED") {
      stepperStatus = "paid";
    } else if (m.status === "SUBMITTED") {
      stepperStatus = "submitted";
    } else if (m.status === "IN_PROGRESS" || m.status === "DISPUTED") {
      stepperStatus = "in_progress";
    }

    return {
      id: m.id,
      title: m.title,
      amount: Number(m.payout_amount),
      status: stepperStatus,
    };
  });

  return (
    <AppShell
      activeRole={profile.role || "client"}
      activeMenuLabel="Overview"
      userName={profile.full_name || user.email || ""}
      userEmail={user.email || ""}
      onSignOut={signOutAction}
    >
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Project detail title block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <span className="font-label-caps text-[10px] text-primary font-bold uppercase tracking-wider">
                {project.category}
              </span>
              <Badge variant={project.status === "completed" ? "success" : "neutral"}>
                {project.status}
              </Badge>
            </div>
            <h1 className="font-headline-lg text-headline-sm md:text-headline-lg font-bold text-on-surface mt-1.5 leading-tight">
              {project.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Contract ID: {project.id}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/40 flex flex-col gap-0.5 min-w-48 text-right self-stretch md:self-auto">
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Total Project Budget</span>
            <span className="font-data-mono text-headline-sm font-bold text-primary block mt-0.5">
              {project.currency} {Number(project.budget).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-outline-variant/30 pb-1.5 select-none">
          <span className="text-xs font-bold text-primary border-b-2 border-primary pb-2 cursor-default">
            Overview & Stepper
          </span>
          <Link
            href={`/projects/${project.id}/messages`}
            className="text-xs font-medium text-muted-foreground hover:text-on-surface pb-2 transition-colors"
          >
            Project Chat & Discussion
          </Link>
        </div>

        {/* Milestone status timeline stepper */}
        <Card className="p-6">
          <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider mb-5">
            Project Stepper Progress
          </h3>
          <MilestoneStepper steps={stepperSteps} />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Details column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="p-6">
              <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider mb-3">
                Project Deliverables Details
              </h3>
              <p className="font-body-sm text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </Card>

            {/* Milestones timeline list */}
            <div className="flex flex-col gap-3">
              <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider px-2">
                Timeline Phases &amp; Deliverables
              </h3>
              {milestonesList.map((m, index) => {
                const assignee = memberProfiles.find((f) => f.id === m.assigned_freelancer_id);
                const pendingInv = pendingInvitationMap[m.id];
                const rawInvProfile = Array.isArray(pendingInv?.profiles) ? pendingInv.profiles[0] : pendingInv?.profiles;
                const pendingName = rawInvProfile?.full_name || pendingInv?.invitee_email || "Freelancer";
                
                let badgeVariant: "neutral" | "success" | "warning" | "error" = "neutral";
                if (m.status === "PAID" || m.status === "APPROVED" || m.status === "AUTO_RELEASED") badgeVariant = "success";
                if (m.status === "SUBMITTED") badgeVariant = "warning";
                if (m.status === "DISPUTED") badgeVariant = "error";

                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-outline-variant bg-surface flex flex-col gap-4 hover:border-outline transition-all"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-body-base text-body-sm font-semibold text-on-surface">
                            Phase {index + 1}: {m.title}
                          </h4>
                          <Badge variant={badgeVariant}>{m.status}</Badge>
                        </div>
                        <p className="text-xs text-secondary mt-1">
                          {m.description}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground font-medium flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                            Deadline: {m.deadline ? new Date(m.deadline).toLocaleDateString() : "No deadline"}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">person</span>
                            Assignee:{" "}
                            {assignee ? (
                              <strong className="text-on-surface font-semibold">{assignee.full_name}</strong>
                            ) : pendingInv ? (
                              <span className="text-primary font-semibold">
                                {pendingName} (Pending invitation)
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="font-data-mono text-body-sm font-semibold text-on-surface shrink-0 self-end md:self-center">
                        {project.currency} {Number(m.payout_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Milestone Actions / Reviews Panel */}
                    <ProjectMilestoneReview
                      milestoneId={m.id}
                      projectId={project.id}
                      status={m.status}
                      title={m.title}
                      payoutAmount={Number(m.payout_amount)}
                      currency={project.currency}
                      submittedAt={m.submitted_at}
                      submissionDescription={m.submission_description}
                      isOwner={isOwner}
                      isAssignedFreelancer={m.assigned_freelancer_id === user.id}
                      dispute={disputeMap[m.id] || null}
                    />
                  </div>
                );
              })}
            </div>

            <ProjectActivityTimeline projectId={project.id} />
          </div>

          {/* Quick info column */}
          <div className="flex flex-col gap-6">
            <ProjectFundingWidget
              projectId={project.id}
              budget={Number(project.budget)}
              currency={project.currency}
              walletAvailable={walletAvailable}
              isOwner={isOwner}
              projectStatus={project.status}
              verificationStatus={profile.verification_status as "pending" | "verified"}
            />

            <ScopeCreepWidget projectId={project.id} />

            <Card className="p-6 flex flex-col gap-4">
              <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider border-b border-outline-variant/30 pb-2">
                Project Info
              </h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Timeline Target</span>
                  <span className="font-semibold text-on-surface">
                    {project.expected_completion ? new Date(project.expected_completion).toLocaleDateString() : "Pending"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Category</span>
                  <span className="font-semibold text-on-surface">{project.category}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Total Milestones</span>
                  <span className="font-semibold text-on-surface">{milestonesList.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
