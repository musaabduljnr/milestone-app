"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction, selectRoleAction } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProjectCard, ProjectTeamMember } from "@/components/milestone/ProjectCard";
import { DbProject, DbMilestone, DbProjectMember } from "./page";

interface ProjectsClientProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role: "client" | "freelancer";
    verification_status: "pending" | "verified";
  };
  userEmail: string;
  initialProjects: DbProject[];
}

export default function ProjectsClient({
  profile,
  userEmail,
  initialProjects,
}: ProjectsClientProps) {
  const [role, setRole] = React.useState<"client" | "freelancer">(profile.role);
  const [isPending, startTransition] = React.useTransition();

  // Search & Filter state
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [statusTab, setStatusTab] = React.useState<"all" | "draft" | "in_progress" | "completed" | "disputed">("all");

  const handleRoleSwitch = (newRole: "client" | "freelancer") => {
    if (isPending) return;
    setRole(newRole);
    startTransition(async () => {
      try {
        await selectRoleAction(newRole);
      } catch (err) {
        console.error("Failed to switch database profile role:", err);
      }
    });
  };

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "";

  // 1. Filter projects list
  const filteredProjects = initialProjects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(search.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = category === "all" || project.category === category;

    const matchesStatus = statusTab === "all" || project.status === statusTab;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Extract unique categories for dropdown option lists
  const categoriesList = Array.from(
    new Set(initialProjects.map((p) => p.category).filter(Boolean))
  );

  return (
    <AppShell
      activeRole={role}
      onRoleSwitch={handleRoleSwitch}
      activeMenuLabel="Projects"
      userName={profile.full_name}
      userEmail={userEmail}
      userInitials={initials}
      userAvatarUrl={profile.avatar_url || undefined}
      onSignOut={signOutAction}
    >
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Header block banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-headline-lg text-display-sm-mobile md:text-headline-lg font-bold text-on-surface">
              Project Contracts
            </h1>
            <p className="font-body-sm text-xs text-muted-foreground mt-1">
              Browse, filter, and access escrow-backed project milestones workspace.
            </p>
          </div>

          {profile.role === "client" && (
            <Link href="/projects/new" className="shrink-0 self-stretch sm:self-auto">
              <Button variant="primary" className="w-full">
                Create Project
              </Button>
            </Link>
          )}
        </div>

        {/* Filter Toolbar Controls */}
        <Card className="p-4 flex flex-col md:flex-row gap-4 bg-surface-container-low border border-outline-variant/30 select-none">
          <div className="flex-1">
            <Input
              placeholder="Search contracts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIconName="search"
            />
          </div>

          <div className="w-full md:w-56">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        {/* Status Horizontal Tabs */}
        <div className="flex border-b border-outline-variant/35 gap-5 text-xs font-bold tracking-tight select-none px-1">
          {(["all", "draft", "in_progress", "completed", "disputed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`pb-2.5 relative capitalize transition-all ${
                statusTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-on-surface"
              }`}
            >
              {tab === "all" ? "All Contracts" : tab.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Projects Cards List grid */}
        {filteredProjects.length === 0 ? (
          <Card className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest border border-outline-variant/30">
            <div className="w-12 h-12 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center mb-4 border border-outline-variant/40">
              <span className="material-symbols-outlined text-[28px]">folder_open</span>
            </div>
            <h3 className="font-headline-sm text-body-base font-bold text-on-surface">
              No matching contracts found
            </h3>
            <p className="font-body-sm text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed">
              Adjust your search keywords or filter toggles to locate your project milestone workspace.
            </p>
            {profile.role === "client" && search === "" && category === "all" && statusTab === "all" && (
              <Link href="/projects/new" className="mt-5">
                <Button variant="primary">Create Project</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredProjects.map((project) => {
              const milestones = project.milestones || [];
              const totalM = milestones.length;
              const completedM = milestones.filter(
                (m: DbMilestone) => m.status === "PAID" || m.status === "APPROVED"
              ).length;
              const percent = totalM > 0 ? Math.round((completedM / totalM) * 100) : 0;

              const teamMembers: ProjectTeamMember[] = (project.project_members || []).map(
                (m: DbProjectMember) => {
                  const name = m.profiles?.full_name || "Member";
                  return {
                    name,
                    initials: name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase(),
                  };
                }
              );

              return (
                <Link
                  href={`/projects/${project.id}`}
                  key={project.id}
                  className="block group focus:outline-none"
                >
                  <ProjectCard
                    title={project.title}
                    clientName={profile.role === "client" ? "You (Client)" : "Client"}
                    status={project.status}
                    budget={Number(project.budget)}
                    progressPercent={percent}
                    completedMilestonesCount={completedM}
                    totalMilestonesCount={totalM}
                    nextDeadline={
                      project.expected_completion
                        ? new Date(project.expected_completion).toLocaleDateString()
                        : undefined
                    }
                    team={teamMembers}
                    onClick={() => {}}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
