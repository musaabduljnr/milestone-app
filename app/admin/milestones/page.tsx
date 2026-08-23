import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export const revalidate = 0;

interface MilestonesPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

interface MilestoneAuditRecord {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_freelancer_id: string | null;
  payout_amount: number;
  deadline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  project: {
    id: string;
    title: string;
    client: {
      id: string;
      full_name: string;
      email: string;
    } | null;
  } | null;
  freelancer: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export default async function AdminMilestonesPage({ searchParams }: MilestonesPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const status = params.status || "all";

  // Query milestones from database
  let query = supabase
    .from("milestones")
    .select(`
      *,
      project:projects (
        id,
        title,
        client:profiles!client_id (id, full_name, email)
      ),
      freelancer:profiles!assigned_freelancer_id (id, full_name, email)
    `);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: milestones, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to query milestones:", error);
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          Milestone Contract Audits
        </h1>
        <p className="text-body-sm text-secondary">
          Track milestone payout cycles, submission status, and deadline completions.
        </p>
      </div>

      {/* Filter panel */}
      <Card className="p-4 flex gap-4 items-center justify-between">
        <form method="GET" action="/admin/milestones" className="flex flex-col md:flex-row gap-3 w-full">
          <select
            name="status"
            defaultValue={status}
            className="h-10 px-4 rounded-xl border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-body-sm w-full md:w-64"
          >
            <option value="all">All States</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="DISPUTED">Disputed</option>
          </select>

          <button
            type="submit"
            className="h-10 text-xs px-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all"
          >
            Apply Status Filter
          </button>

          {status !== "all" && (
            <Link href="/admin/milestones" className="h-10 flex items-center px-4 bg-outline-variant/10 hover:bg-outline-variant/20 rounded-xl text-xs font-semibold text-secondary">
              Clear
            </Link>
          )}
        </form>
      </Card>

      {/* Milestones Audit Table */}
      <Card className="overflow-hidden border border-outline-variant/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant/30 text-caption font-bold text-secondary uppercase tracking-wider text-[10px]">
                <th className="p-4 pl-6">Milestone / Project Context</th>
                <th className="p-4">Assigned Freelancer</th>
                <th className="p-4">Payout Amount</th>
                <th className="p-4">Lifecycle State</th>
                <th className="p-4">Deadline</th>
                <th className="p-4 pr-6">Updated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-xs">
              {(!milestones || milestones.length === 0) ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No milestone records found.
                  </td>
                </tr>
              ) : (
                (milestones as unknown as MilestoneAuditRecord[]).map((ms) => {
                  const clientName = ms.project?.client?.full_name || "Unknown Client";
                  const freelancerName = ms.freelancer?.full_name || "Unassigned";

                  return (
                    <tr key={ms.id} className="hover:bg-surface-container/20 transition-colors">
                      {/* Context */}
                      <td className="p-4 pl-6 flex flex-col gap-0.5">
                        <span className="font-semibold text-on-surface">{ms.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Project: <span className="font-medium text-secondary">{ms.project?.title || "N/A"}</span>
                        </span>
                      </td>

                      {/* Freelancer */}
                      <td className="p-4 text-secondary">
                        <div className="flex flex-col">
                          <span className="font-medium text-on-surface">{freelancerName}</span>
                          <span className="text-[9px] text-muted-foreground">Client: {clientName}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-4 font-semibold text-on-surface">
                        {formatCurrency(ms.payout_amount)}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <Badge
                          variant={
                            ms.status === "PAID"
                              ? "success"
                              : ms.status === "SUBMITTED"
                              ? "warning"
                              : ms.status === "DISPUTED"
                              ? "error"
                              : ms.status === "IN_PROGRESS"
                              ? "info"
                              : "neutral"
                          }
                          className="font-bold text-[9px] px-2 py-0.5"
                        >
                          {ms.status.replace("_", " ")}
                        </Badge>
                      </td>

                      {/* Deadline */}
                      <td className="p-4 text-secondary">
                        {formatDate(ms.deadline)}
                      </td>

                      {/* Updated Date */}
                      <td className="p-4 pr-6 text-secondary">
                        {formatDate(ms.updated_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
