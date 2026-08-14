"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction, selectRoleAction } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import { ActivityEvent, ActivityItem } from "@/components/milestone/ActivityItem";

interface ActivityProject {
  id: string;
  title: string;
  created_at: string;
  currency: string;
}

interface ActivityMember {
  id: string;
  project_id: string;
  role: string;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

interface ActivityMilestone {
  id: string;
  project_id: string;
  title: string;
  payout_amount: number;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
}

interface ActivityEscrow {
  id: string;
  project_id: string;
  amount: number;
  entry_type: "FUNDED" | "HELD" | "RELEASED";
  created_at: string;
}

interface ActivityDispute {
  id: string;
  milestone_id: string;
  reason: string;
  status: string;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface ActivityData {
  projects: ActivityProject[];
  members: ActivityMember[];
  milestones: ActivityMilestone[];
  escrow: ActivityEscrow[];
  disputes: ActivityDispute[];
}

interface ActivityClientProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role: "client" | "freelancer";
    verification_status: "pending" | "verified";
  };
  userEmail: string;
  initialData: ActivityData;
}

export default function ActivityClient({
  profile,
  userEmail,
  initialData,
}: ActivityClientProps) {
  const [role, setRole] = React.useState<"client" | "freelancer">(profile.role);
  const [isPending, startTransition] = React.useTransition();

  // Filter state
  const [filterType, setFilterType] = React.useState<"all" | "escrow" | "milestone" | "dispute" | "members">("all");

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

  // Compile timeline events
  const events = React.useMemo(() => {
    const timelineList: ActivityEvent[] = [];
    const projectMap = new Map(initialData.projects.map((p) => [p.id, p]));

    // 1. Project Creation Events
    initialData.projects.forEach((project) => {
      timelineList.push({
        id: `project-create-${project.id}`,
        type: "CREATE",
        title: "Project Initialized",
        description: `Project "${project.title}" was created on the platform.`,
        created_at: project.created_at,
      });
    });

    // 2. Member Joins
    initialData.members.forEach((m) => {
      const project = projectMap.get(m.project_id);
      const projName = project ? `for "${project.title}"` : "";
      const rawProf = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const userName = rawProf?.full_name || "A user";

      timelineList.push({
        id: `member-assign-${m.id}`,
        type: "ASSIGN",
        title: m.role === "client" ? "Client Owner Registered" : "Freelancer Assigned",
        description: `${userName} joined workspace ${projName} as ${m.role}.`,
        created_at: m.created_at,
      });
    });

    // 3. Milestones
    initialData.milestones.forEach((m) => {
      const project = projectMap.get(m.project_id);
      const projName = project ? `in "${project.title}"` : "";
      const currency = project?.currency || "USD";

      timelineList.push({
        id: `milestone-add-${m.id}`,
        type: "ASSIGN",
        title: `Milestone Phase Defined`,
        description: `Phase "${m.title}" was defined ${projName} with a payout of ${currency} ${Number(
          m.payout_amount
        ).toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
        created_at: m.created_at,
      });

      if (m.submitted_at) {
        timelineList.push({
          id: `milestone-submit-${m.id}`,
          type: "SUBMIT",
          title: "Milestone Deliverables Submitted",
          description: `Freelancer submitted work deliverables for "${m.title}" ${projName}.`,
          created_at: m.submitted_at,
        });
      }

      if (m.approved_at) {
        timelineList.push({
          id: `milestone-approve-${m.id}`,
          type: "APPROVE",
          title: "Milestone Deliverables Approved",
          description: `Client approved submitted deliverables for "${m.title}" ${projName}.`,
          created_at: m.approved_at,
        });
      }

      if (m.paid_at) {
        timelineList.push({
          id: `milestone-paid-${m.id}`,
          type: "PAID",
          title: "Escrow Payout Released",
          description: `Escrow release of ${currency} ${Number(
            m.payout_amount
          ).toLocaleString(undefined, { minimumFractionDigits: 2 })} for "${m.title}" settled.`,
          created_at: m.paid_at,
        });
      }
    });

    // 4. Escrow deposits
    initialData.escrow.forEach((e) => {
      const project = projectMap.get(e.project_id);
      const currency = project?.currency || "USD";
      if (e.entry_type === "FUNDED") {
        timelineList.push({
          id: `escrow-deposit-${e.id}`,
          type: "FUND",
          title: "Escrow Balance Locked",
          description: `Client deposited and locked contract budget of ${currency} ${Number(
            e.amount
          ).toLocaleString(undefined, { minimumFractionDigits: 2 })} for "${
            project?.title || "Project"
          }".`,
          created_at: e.created_at,
        });
      }
    });

    // 5. Disputes
    const milestoneMap = new Map(initialData.milestones.map((m) => [m.id, m]));
    initialData.disputes.forEach((d) => {
      const milestone = milestoneMap.get(d.milestone_id);
      const project = milestone ? projectMap.get(milestone.project_id) : null;
      const projName = project ? `on "${project.title}"` : "";

      timelineList.push({
        id: `dispute-raise-${d.id}`,
        type: "DISPUTE",
        title: "Contract Escrow Disputed",
        description: `Dispute opened on phase "${
          milestone?.title || "Milestone"
        }" ${projName}: "${d.reason}". Escrow clock frozen.`,
        created_at: d.created_at,
      });

      if (d.resolved_at) {
        let desc = "Dispute settled.";
        if (d.resolution === "CLIENT_FAVORED") {
          desc = "Dispute resolved in favor of client. Escrow refunded.";
        } else if (d.resolution === "FREELANCER_FAVORED") {
          desc = "Dispute resolved in favor of freelancer. Escrow paid.";
        } else if (d.resolution === "PARTIAL_RESOLUTION") {
          desc = "Dispute settled via mutual split proposal.";
        }
        timelineList.push({
          id: `dispute-resolve-${d.id}`,
          type: "APPROVE",
          title: "Dispute Resolved",
          description: desc,
          created_at: d.resolved_at,
        });
      }
    });

    // Sort: Most recent first
    return timelineList.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [initialData]);

  // Filter events by type
  const filteredEvents = React.useMemo(() => {
    return events.filter((ev) => {
      if (filterType === "all") return true;
      if (filterType === "escrow") return ev.type === "FUND" || ev.type === "PAID";
      if (filterType === "milestone")
        return ev.type === "SUBMIT" || ev.type === "APPROVE" || ev.id.startsWith("milestone-add");
      if (filterType === "dispute") return ev.type === "DISPUTE";
      if (filterType === "members") return ev.type === "ASSIGN";
      return true;
    });
  }, [events, filterType]);

  return (
    <AppShell
      activeRole={role}
      onRoleSwitch={handleRoleSwitch}
      activeMenuLabel="Activity"
      userName={profile.full_name}
      userEmail={userEmail}
      userInitials={initials}
      userAvatarUrl={profile.avatar_url || undefined}
      onSignOut={signOutAction}
    >
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Header Block banner */}
        <div>
          <h1 className="font-headline-lg text-display-sm-mobile md:text-headline-lg font-bold text-on-surface">
            Global Activity Audit
          </h1>
          <p className="font-body-sm text-xs text-muted-foreground mt-1">
            Browse and search escrow logs, milestones submissions, and team workspace events.
          </p>
        </div>

        {/* Categories filters */}
        <div className="flex border-b border-outline-variant/35 gap-5 text-xs font-bold tracking-tight select-none px-1 overflow-x-auto whitespace-nowrap scrollbar-none">
          {(
            [
              { key: "all", label: "All Audit Logs" },
              { key: "escrow", label: "Escrow Ledger" },
              { key: "milestone", label: "Milestone Stages" },
              { key: "dispute", label: "Disputes Log" },
              { key: "members", label: "Team Membership" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`pb-2.5 relative transition-all ${
                filterType === tab.key
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Activities List timeline */}
        <Card className="p-6 border border-outline-variant/20 flex flex-col gap-4">
          {filteredEvents.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
              <span className="material-symbols-outlined text-[32px]">event_note</span>
              <span className="text-sm font-semibold text-secondary">No activities found</span>
              <p className="text-xs text-muted-foreground mt-1">
                Timeline events will appear as contracts are created and processed.
              </p>
            </div>
          ) : (
            <div className="flex flex-col mt-2">
              {filteredEvents.map((ev, index) => (
                <ActivityItem
                  key={ev.id}
                  event={ev}
                  isLast={index === filteredEvents.length - 1}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
