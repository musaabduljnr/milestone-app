import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export const revalidate = 0;

interface InvitationsPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

interface InvitationAuditRecord {
  id: string;
  project_id: string;
  milestone_id: string;
  invited_by: string;
  invitee_email: string;
  invitee_user_id: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  project: {
    id: string;
    title: string;
  } | null;
  milestone: {
    id: string;
    title: string;
    payout_amount: number;
  } | null;
  inviter: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export default async function AdminInvitationsPage({ searchParams }: InvitationsPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const status = params.status || "all";

  // Query project invitations from database
  let query = supabase
    .from("project_invitations")
    .select(`
      *,
      project:projects (id, title),
      milestone:milestones (id, title, payout_amount),
      inviter:profiles!invited_by (id, full_name, email)
    `);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: invitations, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to query invitations:", error);
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
          Project Invitations Audit
        </h1>
        <p className="text-body-sm text-secondary">
          Track outstanding, accepted, or declined project invitations sent to freelancers.
        </p>
      </div>

      {/* Filter panel */}
      <Card className="p-4 flex gap-4 items-center justify-between">
        <form method="GET" action="/admin/invitations" className="flex flex-col md:flex-row gap-3 w-full">
          <select
            name="status"
            defaultValue={status}
            className="h-10 px-4 rounded-xl border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-body-sm w-full md:w-64"
          >
            <option value="all">All Invitation Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DECLINED">Declined</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            type="submit"
            className="h-10 text-xs px-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all"
          >
            Apply Filters
          </button>

          {status !== "all" && (
            <Link href="/admin/invitations" className="h-10 flex items-center px-4 bg-outline-variant/10 hover:bg-outline-variant/20 rounded-xl text-xs font-semibold text-secondary">
              Clear
            </Link>
          )}
        </form>
      </Card>

      {/* Invitations Table */}
      <Card className="overflow-hidden border border-outline-variant/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant/30 text-caption font-bold text-secondary uppercase tracking-wider text-[10px]">
                <th className="p-4 pl-6">Invitation Target</th>
                <th className="p-4">Project Context</th>
                <th className="p-4">Invited By</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 pr-6">Responded Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-xs">
              {(!invitations || invitations.length === 0) ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No project invitations found.
                  </td>
                </tr>
              ) : (
                (invitations as unknown as InvitationAuditRecord[]).map((invite) => {
                  const projectTitle = invite.project?.title || "N/A";
                  const milestoneTitle = invite.milestone?.title || "N/A";
                  const milestonePayout = invite.milestone?.payout_amount || 0;
                  const inviterName = invite.inviter?.full_name || "Unknown Client";

                  return (
                    <tr key={invite.id} className="hover:bg-surface-container/20 transition-colors">
                      {/* Invitee Details */}
                      <td className="p-4 pl-6 flex flex-col gap-0.5">
                        <span className="font-semibold text-on-surface">{invite.invitee_email}</span>
                        <span className="text-[9px] text-muted-foreground">
                          ID: <span className="font-mono">{invite.id}</span>
                        </span>
                      </td>

                      {/* Project Context */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-on-surface">{projectTitle}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {milestoneTitle} ({formatCurrency(milestonePayout)})
                          </span>
                        </div>
                      </td>

                      {/* Inviter */}
                      <td className="p-4 text-secondary">
                        <div className="flex flex-col">
                          <span className="font-medium text-on-surface">{inviterName}</span>
                          <span className="text-[9px] text-muted-foreground">{invite.inviter?.email}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <Badge
                          variant={
                            invite.status === "ACCEPTED"
                              ? "success"
                              : invite.status === "PENDING"
                              ? "warning"
                              : invite.status === "DECLINED"
                              ? "error"
                              : "neutral"
                          }
                          className="font-bold text-[9px] px-2.5 py-0.5"
                        >
                          {invite.status}
                        </Badge>
                      </td>

                      {/* Created Date */}
                      <td className="p-4 text-secondary">
                        {formatDate(invite.created_at)}
                      </td>

                      {/* Responded Date */}
                      <td className="p-4 pr-6 text-secondary">
                        {formatDate(invite.responded_at)}
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
