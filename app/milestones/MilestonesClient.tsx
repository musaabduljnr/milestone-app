"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { MilestoneItem } from "./page";

interface MilestonesClientProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role: "client" | "freelancer";
    verification_status: "pending" | "verified";
  };
  userEmail: string;
  initialMilestones: MilestoneItem[];
}

export default function MilestonesClient({
  profile,
  userEmail,
  initialMilestones,
}: MilestonesClientProps) {
  // Search & Filter state
  const [search, setSearch] = React.useState("");
  const [statusTab, setStatusTab] = React.useState<
    "all" | "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "PAID" | "DISPUTED"
  >("all");

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "";

  // Filter milestones list
  const filteredMilestones = initialMilestones.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase())) ||
      (m.project?.title && m.project.title.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusTab === "all" ||
      m.status === statusTab ||
      (statusTab === "PAID" && m.status === "APPROVED"); // Treat approved as paid/released in UI list

    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell
      activeRole={profile.role}
      activeMenuLabel="Milestones"
      userName={profile.full_name}
      userEmail={userEmail}
      userInitials={initials}
      userAvatarUrl={profile.avatar_url || undefined}
      onSignOut={signOutAction}
    >
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Header Block banner */}
        <div>
          <h1 className="font-headline-lg text-display-sm-mobile md:text-headline-lg font-bold text-on-surface">
            Milestones Workspace
          </h1>
          <p className="font-body-sm text-xs text-muted-foreground mt-1">
            Track deliverable statuses, start active assignments, and manage escrow payouts.
          </p>
        </div>

        {/* Search controls */}
        <Card className="p-4 bg-surface-container-low border border-outline-variant/30 select-none">
          <Input
            placeholder="Search by milestone name, project, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIconName="search"
          />
        </Card>

        {/* Status Horizontal Tabs */}
        <div className="flex border-b border-outline-variant/35 gap-5 text-xs font-bold tracking-tight select-none px-1 overflow-x-auto whitespace-nowrap scrollbar-none">
          {(["all", "NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "PAID", "DISPUTED"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`pb-2.5 relative capitalize transition-all ${
                  statusTab === tab
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-on-surface"
                }`}
              >
                {tab === "all"
                  ? "All Milestones"
                  : tab === "PAID"
                  ? "Paid & Approved"
                  : tab.replace("_", " ")}
              </button>
            )
          )}
        </div>

        {/* Milestones Cards List */}
        {filteredMilestones.length === 0 ? (
          <Card className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest border border-outline-variant/30 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center mb-4 border border-outline-variant/40">
              <span className="material-symbols-outlined text-[28px]">assignment_turned_in</span>
            </div>
            <h3 className="font-headline-sm text-body-base font-bold text-on-surface">
              No milestones found
            </h3>
            <p className="font-body-sm text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed">
              No milestone contracts meet your selected search inputs or status filter toggles.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredMilestones.map((m) => {
              // Resolve status badges variants
              let badgeVariant: "neutral" | "success" | "warning" | "error" | "info" = "neutral";
              if (m.status === "PAID" || m.status === "APPROVED") badgeVariant = "success";
              else if (m.status === "SUBMITTED") badgeVariant = "warning";
              else if (m.status === "IN_PROGRESS") badgeVariant = "info";
              else if (m.status === "DISPUTED") badgeVariant = "error";

              const currency = m.project?.currency || "USD";

              return (
                <Card
                  key={m.id}
                  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-outline-variant/30 hover:border-outline-variant transition-all bg-surface-container-lowest shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-label-caps text-[9px] font-bold text-primary uppercase tracking-wider block">
                        {m.project?.title || "Project Contract"}
                      </span>
                      <Badge variant={badgeVariant}>{m.status}</Badge>
                    </div>
                    <h3 className="font-body-base text-body-sm font-bold text-on-surface mt-1.5 leading-snug">
                      {m.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {m.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-3.5 mt-3 text-[10px] text-secondary font-medium">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                        Deadline: {m.deadline ? new Date(m.deadline).toLocaleDateString() : "No deadline"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t border-outline-variant/10 md:border-none">
                    <div className="font-data-mono text-body-base font-bold text-on-surface">
                      {currency} {Number(m.payout_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>

                    {profile.role === "client" ? (
                      <Link href={`/projects/${m.project_id}`} className="shrink-0">
                        <Button variant="secondary" size="sm">
                          Review Contract
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/freelancer/milestones/${m.id}`} className="shrink-0">
                        <Button variant="primary" size="sm">
                          Open Workspace
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
