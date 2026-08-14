import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProjectCard, ProjectTeamMember } from "@/components/milestone/ProjectCard";

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 2. Fetch authenticated profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/signup?error=Profile creation pending. Please sign in again.");
  }

  // Intercept role bypasses
  if (!profile.role) {
    redirect("/auth/role-selection");
  }

  interface DbProjectMember {
    user_id: string;
    role: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    } | null;
  }

  interface DbMilestone {
    id: string;
    status: string;
  }

  interface DbProject {
    id: string;
    title: string;
    description: string;
    category: string;
    budget: number;
    currency: string;
    status: "draft" | "in_progress" | "completed" | "disputed";
    expected_completion?: string | null;
    milestones: DbMilestone[];
    project_members: DbProjectMember[];
  }

  // 3. Fetch real project rows from database with milestones and team memberships
  let rawProjects: DbProject[] = [];
  if (profile.role === "client") {
    const { data } = await supabase
      .from("projects")
      .select(`
        *,
        milestones(*),
        project_members(
          user_id,
          role,
          profiles(full_name, avatar_url)
        )
      `)
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });
    rawProjects = data || [];
  } else {
    // If freelancer, retrieve projects where they are member participants
    const { data } = await supabase
      .from("project_members")
      .select(`
        project_id,
        projects(
          *,
          milestones(*),
          project_members(
            user_id,
            role,
            profiles(full_name, avatar_url)
          )
        )
      `)
      .eq("user_id", user.id);
    rawProjects = (data || []).map((d) => d.projects as unknown as DbProject).filter(Boolean);
  }

  return (
    <DashboardClient profile={profile} userEmail={user.email || ""}>
      <div className="flex flex-col gap-6">
        {/* Welcome Card banner */}
        <Card className="p-8 flex flex-col gap-4">
          <div>
            <h1 className="font-headline-lg text-display-lg-mobile md:text-headline-lg font-bold text-on-surface">
              Welcome, {profile.full_name || user.email}
            </h1>
            <p className="font-body-sm text-body-sm text-muted-foreground mt-1">
              Milestone Escrow Project Management Dashboard
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/40 flex flex-col gap-1">
              <span className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                Account Role
              </span>
              <span className="font-body-base text-body-base font-bold capitalize mt-1">
                {profile.role}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/40 flex flex-col gap-1">
              <span className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                Verification Status
              </span>
              <div className="mt-1.5 flex items-center">
                <Badge variant={profile.verification_status === "verified" ? "success" : "neutral"}>
                  {profile.verification_status}
                </Badge>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-surface-container border border-outline-variant/40 flex flex-col gap-1">
              <span className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider">
                Authentication Email
              </span>
              <span className="font-body-sm text-body-sm text-on-surface truncate mt-1">
                {user.email}
              </span>
            </div>
          </div>
        </Card>

        {/* Dynamic Project Content section */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-headline-sm text-body-base font-bold text-on-surface">
              Active Project Contracts
            </h2>
            {profile.role === "client" && rawProjects.length > 0 && (
              <Link href="/projects/new">
                <Button variant="primary" size="sm">
                  Create Project
                </Button>
              </Link>
            )}
          </div>

          {rawProjects.length === 0 ? (
            /* Bento audited Empty State */
            <Card className="min-h-[280px] flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest">
              <div className="w-12 h-12 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center mb-4 border border-outline-variant/40">
                <span className="material-symbols-outlined text-[28px]">folder_open</span>
              </div>
              <h3 className="font-headline-sm text-body-base font-bold text-on-surface leading-snug">
                No active project contracts
              </h3>
              <p className="font-body-sm text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed">
                {profile.role === "client"
                  ? "Initialize your workspace by creating a secure escrow-backed project milestone contract."
                  : "You are not currently assigned to any project milestone contracts."}
              </p>
              {profile.role === "client" && (
                <Link href="/projects/new" className="mt-5">
                  <Button variant="primary">Create Project</Button>
                </Link>
              )}
            </Card>
          ) : (
            /* List of active project cards */
            <div className="flex flex-col gap-4">
              {rawProjects.map((project) => {
                const milestones = project.milestones || [];
                const totalM = milestones.length;
                const completedM = milestones.filter((m: DbMilestone) => m.status === "PAID" || m.status === "APPROVED").length;
                const percent = totalM > 0 ? Math.round((completedM / totalM) * 100) : 0;

                // Resolve members to team format for avatar lists
                const teamMembers: ProjectTeamMember[] = (project.project_members || []).map((m: DbProjectMember) => {
                  const name = m.profiles?.full_name || "Member";
                  return {
                    name,
                    initials: name.split(" ").map((n: string) => n[0]).join("").toUpperCase(),
                  };
                });

                return (
                  <Link href={`/projects/${project.id}`} key={project.id} className="block group focus:outline-none">
                    <ProjectCard
                      title={project.title}
                      clientName={profile.role === "client" ? "You (Client)" : "Client"}
                      status={project.status}
                      budget={Number(project.budget)}
                      progressPercent={percent}
                      completedMilestonesCount={completedM}
                      totalMilestonesCount={totalM}
                      nextDeadline={project.expected_completion ? new Date(project.expected_completion).toLocaleDateString() : undefined}
                      team={teamMembers}
                      onClick={() => {}}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardClient>
  );
}
