import React from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export const revalidate = 0;

interface ProjectsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}

interface ProjectMemberAudit {
  role: "client" | "freelancer";
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

interface ProjectDisputeAudit {
  id: string;
  status: string;
}

interface ProjectMilestoneAudit {
  id: string;
  title: string;
  payout_amount: number;
  status: string;
}

interface ProjectAuditRecord {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  budget: number;
  currency: string;
  status: "draft" | "in_progress" | "completed" | "disputed";
  expected_completion: string | null;
  created_at: string;
  updated_at: string;
  client: {
    full_name: string;
    email: string;
  } | null;
  project_members: ProjectMemberAudit[];
  milestones: ProjectMilestoneAudit[];
  disputes: ProjectDisputeAudit[];
}

export default async function AdminProjectsPage({ searchParams }: ProjectsPageProps) {
  const supabase = await createAdminClient();
  const params = await searchParams;
  const q = params.q || "";
  const status = params.status || "all";

  // Query projects from database
  let query = supabase
    .from("projects")
    .select(`
      *,
      client:profiles!client_id (full_name, email),
      project_members (
        role,
        profiles:user_id (full_name, email)
      ),
      milestones (id, title, payout_amount, status),
      disputes (id, status)
    `);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: projects, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to query projects:", error);
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Typecast to avoid any types
  const typedProjects = (projects || []) as unknown as ProjectAuditRecord[];

  // Filter projects by title or category
  const filteredProjects = typedProjects.filter((project) => {
    if (!q) return true;
    const titleMatch = (project.title || "").toLowerCase().includes(q.toLowerCase());
    const categoryMatch = (project.category || "").toLowerCase().includes(q.toLowerCase());
    const clientMatch = (project.client?.full_name || "").toLowerCase().includes(q.toLowerCase());
    return titleMatch || categoryMatch || clientMatch;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          Project Operations Auditing
        </h1>
        <p className="text-body-sm text-secondary">
          Audit platform project contracts, escrow allocations, disputes, and team members.
        </p>
      </div>

      {/* Filter and Search Panel */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form method="GET" action="/admin/projects" className="flex flex-col md:flex-row gap-3 w-full">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none select-none">
              search
            </span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by project name, category or client..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-body-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            name="status"
            defaultValue={status}
            className="h-10 px-4 rounded-xl border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-body-sm"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="disputed">Disputed</option>
          </select>

          <button
            type="submit"
            className="h-10 text-xs px-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all"
          >
            Apply Filters
          </button>

          {(q || status !== "all") && (
            <Link href="/admin/projects" className="h-10 flex items-center px-4 bg-outline-variant/10 hover:bg-outline-variant/20 rounded-xl text-xs font-semibold text-secondary">
              Clear
            </Link>
          )}
        </form>
      </Card>

      {/* Projects Audit List */}
      <div className="flex flex-col gap-4">
        {filteredProjects.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-xs">
            No projects found matching the criteria.
          </Card>
        ) : (
          filteredProjects.map((project) => {
            const dispute = project.disputes?.find((d: ProjectDisputeAudit) => d.status === "OPEN");
            const members = project.project_members || [];
            const clientName = project.client?.full_name || "Unknown Client";

            return (
              <Card key={project.id} className="p-6 flex flex-col gap-6 border-l-4 border-l-primary/45">
                {/* Header row */}
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-primary uppercase font-bold tracking-widest block mb-0.5">
                      {project.category || "Contract"}
                    </span>
                    <h3 className="text-body-base font-bold text-on-surface">
                      {project.title || "Untitled Project"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Project ID: <span className="font-mono">{project.id}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {dispute && (
                      <Badge variant="error" className="text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide">
                        Active Dispute
                      </Badge>
                    )}
                    <Badge
                      variant={
                        project.status === "completed"
                          ? "success"
                          : project.status === "in_progress"
                          ? "info"
                          : project.status === "disputed"
                          ? "error"
                          : "neutral"
                      }
                      className="capitalize text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide"
                    >
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                {/* Info summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b border-outline-variant/30 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Client Owner</span>
                    <span className="font-semibold text-on-surface">{clientName}</span>
                    <span className="text-[10px] text-secondary">{project.client?.email}</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Budget Allocation</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(project.budget || 0)}</span>
                    <span className="text-[10px] text-secondary uppercase font-semibold">{project.currency || "USD"} (Simulated)</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Milestones Count</span>
                    <span className="font-semibold text-on-surface">{project.milestones?.length || 0} milestones</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Created Date</span>
                    <span className="font-semibold text-on-surface">{formatDate(project.created_at)}</span>
                  </div>
                </div>

                {/* Team members section */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                    Contract Members ({members.length})
                  </span>
                  {members.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground italic">No members joined yet.</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {members.map((member: ProjectMemberAudit, index: number) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-[11px]">
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px]">
                            {(member.profiles?.full_name || "M")[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-on-surface">{member.profiles?.full_name}</span>
                          <span className="text-[9px] text-muted-foreground capitalize font-bold bg-outline-variant/35 px-1.5 py-0.5 rounded-md">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
