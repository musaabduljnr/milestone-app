import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const revalidate = 0;

interface PlatformEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

interface PMRecord {
  id: string;
  project_id: string;
  role: "client" | "freelancer";
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

interface MSRecord {
  id: string;
  project_id: string;
  title: string;
  payout_amount: number;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  projects: {
    title: string;
  } | null;
}

interface EscrowRecord {
  id: string;
  project_id: string;
  amount: number;
  entry_type: "FUNDED" | "RELEASED" | "REFUNDED";
  created_at: string;
  projects: {
    title: string;
  } | null;
}

interface DisputeRecord {
  id: string;
  reason: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  milestones: {
    title: string;
  } | null;
}

interface KYCRecord {
  id: string;
  user_id: string;
  action: "STARTED" | "COMPLETED" | "FAILED";
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
}

export default async function AdminActivityPage() {
  const supabase = await createClient();

  // Fetch all entities platform-wide
  const [
    { data: projects },
    { data: membersData },
    { data: milestonesData },
    { data: escrowData },
    { data: disputesData },
    { data: kycLogsData },
  ] = await Promise.all([
    supabase.from("projects").select("id, title, created_at").limit(50),
    supabase.from("project_members").select("id, project_id, role, created_at, profiles!user_id(full_name)").limit(50),
    supabase.from("milestones").select("id, project_id, title, payout_amount, created_at, submitted_at, approved_at, paid_at, projects(title)").limit(50),
    supabase.from("escrow_ledger").select("id, project_id, amount, entry_type, created_at, projects(title)").limit(50),
    supabase.from("disputes").select("id, reason, status, created_at, resolved_at, milestones(title)").limit(50),
    supabase.from("verification_audit_log").select("id, user_id, action, created_at, profiles!user_id(full_name)").limit(50),
  ]);

  const members = (membersData || []) as unknown as PMRecord[];
  const milestones = (milestonesData || []) as unknown as MSRecord[];
  const escrow = (escrowData || []) as unknown as EscrowRecord[];
  const disputes = (disputesData || []) as unknown as DisputeRecord[];
  const kycLogs = (kycLogsData || []) as unknown as KYCRecord[];

  const events: PlatformEvent[] = [];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  // Compile Projects
  (projects || []).forEach((p) => {
    events.push({
      id: `p-${p.id}`,
      type: "PROJECT_CREATED",
      title: "New Project Created",
      description: `Project contract "${p.title}" was registered on the platform.`,
      timestamp: p.created_at,
    });
  });

  // Compile Members
  (members || []).forEach((m: PMRecord) => {
    events.push({
      id: `m-${m.id}`,
      type: "MEMBER_JOINED",
      title: "Team Member Joined",
      description: `${m.profiles?.full_name || "A user"} joined a project as a ${m.role}.`,
      timestamp: m.created_at,
    });
  });

  // Compile Milestones lifecycle
  (milestones || []).forEach((ms: MSRecord) => {
    const parentTitle = ms.projects?.title || "N/A";
    
    events.push({
      id: `ms-c-${ms.id}`,
      type: "MILESTONE_CREATED",
      title: "Milestone Created",
      description: `Milestone "${ms.title}" ($${ms.payout_amount}) was added to project "${parentTitle}".`,
      timestamp: ms.created_at,
    });

    if (ms.submitted_at) {
      events.push({
        id: `ms-s-${ms.id}`,
        type: "MILESTONE_SUBMITTED",
        title: "Milestone Work Submitted",
        description: `Freelancer submitted work completion for milestone "${ms.title}".`,
        timestamp: ms.submitted_at,
      });
    }

    if (ms.approved_at) {
      events.push({
        id: `ms-a-${ms.id}`,
        type: "MILESTONE_APPROVED",
        title: "Milestone Approved",
        description: `Client approved work deliverables for milestone "${ms.title}".`,
        timestamp: ms.approved_at,
      });
    }

    if (ms.paid_at) {
      events.push({
        id: `ms-p-${ms.id}`,
        type: "MILESTONE_PAID",
        title: "Milestone Payment Disbursed",
        description: `Funds of ${formatCurrency(ms.payout_amount)} released from escrow for "${ms.title}".`,
        timestamp: ms.paid_at,
      });
    }
  });

  // Compile Escrow Ledger
  (escrow || []).forEach((e: EscrowRecord) => {
    const parentTitle = e.projects?.title || "N/A";
    events.push({
      id: `e-${e.id}`,
      type: `ESCROW_${e.entry_type}`,
      title: `Escrow ${e.entry_type.replace("_", " ")}`,
      description: `Escrow txn: ${formatCurrency(e.amount)} was ${e.entry_type.toLowerCase()} for project "${parentTitle}".`,
      timestamp: e.created_at,
    });
  });

  // Compile Disputes
  (disputes || []).forEach((d: DisputeRecord) => {
    const msTitle = d.milestones?.title || "N/A";
    
    events.push({
      id: `d-c-${d.id}`,
      type: "DISPUTE_FILED",
      title: "Dispute Opened",
      description: `Payment dispute opened for milestone "${msTitle}". Reason: ${d.reason || "None"}`,
      timestamp: d.created_at,
    });

    if (d.resolved_at) {
      events.push({
        id: `d-r-${d.id}`,
        type: "DISPUTE_RESOLVED",
        title: "Dispute Settled",
        description: `Dispute for milestone "${msTitle}" was arbitrated (Status: ${d.status}).`,
        timestamp: d.resolved_at,
      });
    }
  });

  // Compile KYC Logs
  (kycLogs || []).forEach((k: KYCRecord) => {
    events.push({
      id: `k-${k.id}`,
      type: `KYC_${k.action}`,
      title: `KYC Verification ${k.action}`,
      description: `User "${k.profiles?.full_name || "A user"}" identity verification status marked as ${k.action.toLowerCase()}.`,
      timestamp: k.created_at,
    });
  });

  // Sort events by timestamp descending
  const sortedEvents = events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getEventBadge = (type: string): "success" | "warning" | "error" | "info" | "neutral" => {
    if (type.startsWith("ESCROW_")) return "success";
    if (type.startsWith("DISPUTE_")) return "error";
    if (type.startsWith("KYC_")) return "warning";
    if (type.includes("SUBMITTED")) return "info";
    return "neutral";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          Platform Activity Logs
        </h1>
        <p className="text-body-sm text-secondary">
          Platform-wide audit trails tracking projects, members, escrow payouts, disputes, and KYC events.
        </p>
      </div>

      {/* Timeline display */}
      <Card className="p-6 flex flex-col gap-6">
        <h2 className="text-body-base font-bold text-on-surface">System Activity Feed</h2>
        
        {sortedEvents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs italic">
            No system log events recorded on the platform.
          </div>
        ) : (
          <div className="relative border-l-2 border-outline-variant/35 pl-6 ml-3 flex flex-col gap-6 text-xs">
            {sortedEvents.map((event) => (
              <div key={event.id} className="relative">
                {/* Bullet indicator */}
                <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#f4f3f6] dark:bg-[#1c1b1f] border-2 border-primary flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>

                {/* Event Card */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 rounded-xl bg-surface-container border border-outline-variant/30">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface">{event.title}</span>
                      <Badge variant={getEventBadge(event.type)} className="text-[8px] px-1.5 font-bold uppercase tracking-wider">
                        {event.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-secondary leading-relaxed">{event.description}</p>
                  </div>

                  <span className="text-[10px] text-muted-foreground font-medium shrink-0 self-start md:self-auto">
                    {formatDate(event.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
