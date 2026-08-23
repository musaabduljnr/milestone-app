import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. Fetch Users stats
  const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const { count: totalClients } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client");
  const { count: totalFreelancers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "freelancer");
  const { count: totalPendingVerification } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending");

  // 2. Fetch Projects stats
  const { count: totalProjects } = await supabase.from("projects").select("*", { count: "exact", head: true });
  const { count: activeProjects } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "in_progress");
  const { count: disputedProjects } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "disputed");

  // 3. Fetch Milestones stats
  const { count: totalMilestones } = await supabase.from("milestones").select("*", { count: "exact", head: true });
  const { count: submittedMilestones } = await supabase.from("milestones").select("*", { count: "exact", head: true }).eq("status", "SUBMITTED");
  const { count: paidMilestones } = await supabase.from("milestones").select("*", { count: "exact", head: true }).eq("status", "PAID");

  // 4. Fetch Financial simulation stats
  const { data: wallets } = await supabase.from("wallets").select("available_balance, pending_balance");
  const totalAvailableSimulated = (wallets || []).reduce((acc, curr) => acc + Number(curr.available_balance || 0), 0);
  const totalHeldEscrowSimulated = (wallets || []).reduce((acc, curr) => acc + Number(curr.pending_balance || 0), 0);

  const { data: ledger } = await supabase.from("escrow_ledger").select("amount, entry_type");
  const totalFundedSimulated = (ledger || [])
    .filter((l) => l.entry_type === "FUNDED")
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalReleasedSimulated = (ledger || [])
    .filter((l) => l.entry_type === "RELEASED")
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // 5. Operations counts
  const { count: openDisputes } = await supabase.from("disputes").select("*", { count: "exact", head: true }).eq("status", "OPEN");
  const { count: pendingInvites } = await supabase.from("project_invitations").select("*", { count: "exact", head: true }).eq("status", "PENDING");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Platform Summary Greeting */}
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          System Overview
        </h1>
        <p className="text-body-sm text-secondary">
          Platform-level metrics and system auditing metrics.
        </p>
      </div>

      {/* Grid 1: Operational Warning Banner */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5 select-none">
          info
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Simulated Ledger Mode
          </span>
          <p className="text-[11px] text-secondary leading-relaxed">
            All escrow, payout, and wallet balances are **SIMULATED** ledgers. They do not represent real-world financial assets or live currency transactions.
          </p>
        </div>
      </div>

      {/* Grid 2: Main Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* User Summary Card */}
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Users</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">group</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
              {totalUsers || 0}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              {totalClients || 0} Clients • {totalFreelancers || 0} Freelancers
            </span>
          </div>
        </Card>

        {/* Projects Summary Card */}
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Projects</span>
            <div className="w-8 h-8 rounded-lg bg-success-container/20 text-success-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">folder</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
              {totalProjects || 0}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              {activeProjects || 0} Active • {disputedProjects || 0} Disputed
            </span>
          </div>
        </Card>

        {/* Milestones Summary Card */}
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Milestones</span>
            <div className="w-8 h-8 rounded-lg bg-info-container/20 text-info-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
              {totalMilestones || 0}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">
              {paidMilestones || 0} Paid • {submittedMilestones || 0} Pending Approval
            </span>
          </div>
        </Card>

        {/* Escrow Balance Card */}
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Simulated Escrow</span>
            <div className="w-8 h-8 rounded-lg bg-warning-container/20 text-warning-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-lg text-headline-lg font-bold text-on-surface truncate">
              {formatCurrency(totalHeldEscrowSimulated)}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">
              Held in Escrow (Simulated)
            </span>
          </div>
        </Card>
      </div>

      {/* Grid 3: Operational Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operations Queue Checklist */}
        <Card className="lg:col-span-2 p-6 flex flex-col gap-6">
          <h2 className="text-body-base font-bold text-on-surface">Operations Work Queue</h2>
          <div className="flex flex-col gap-3">
            {/* Disputes Action Row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${openDisputes && openDisputes > 0 ? "bg-error/10 text-error" : "bg-muted/15 text-muted-foreground"}`}>
                  <span className="material-symbols-outlined text-[20px]">gavel</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">Disputes Needing Arbitration</span>
                  <span className="text-[10px] text-secondary">Escrow funds contested by clients or freelancers.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {openDisputes && openDisputes > 0 ? (
                  <Badge variant="error" className="py-0.5 px-2 text-[10px]">
                    {openDisputes} Action Required
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="py-0.5 px-2 text-[10px] bg-muted/10">
                    Clear
                  </Badge>
                )}
                <Link href="/admin/disputes" className="text-xs text-primary font-bold hover:underline shrink-0">
                  Manage
                </Link>
              </div>
            </div>

            {/* Verifications Action Row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${totalPendingVerification && totalPendingVerification > 0 ? "bg-primary/10 text-primary" : "bg-muted/15 text-muted-foreground"}`}>
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">KYC Identity Verifications</span>
                  <span className="text-[10px] text-secondary">Uploaded Photo ID and personal details audits.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {totalPendingVerification && totalPendingVerification > 0 ? (
                  <Badge variant="warning" className="py-0.5 px-2 text-[10px]">
                    {totalPendingVerification} Pending Review
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="py-0.5 px-2 text-[10px] bg-muted/10">
                    Clear
                  </Badge>
                )}
                <Link href="/admin/verifications" className="text-xs text-primary font-bold hover:underline shrink-0">
                  Review
                </Link>
              </div>
            </div>

            {/* Invitations Row */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${pendingInvites && pendingInvites > 0 ? "bg-info-container/10 text-info-container" : "bg-muted/15 text-muted-foreground"}`}>
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface">Pending Invitations</span>
                  <span className="text-[10px] text-secondary">Active outbound project invites awaiting freelancer acceptance.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-secondary">{pendingInvites || 0} Pending</span>
                <Link href="/admin/invitations" className="text-xs text-primary font-bold hover:underline shrink-0 ml-2">
                  Audit
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Ledger Statistics (Simulation) */}
        <Card className="p-6 flex flex-col gap-6">
          <h2 className="text-body-base font-bold text-on-surface">Simulated Ledger Ledgering</h2>
          <div className="flex flex-col gap-4">
            {/* Total Wallet Balances */}
            <div className="flex justify-between items-center pb-3.5 border-b border-outline-variant/30">
              <span className="text-xs text-secondary">Available Wallet Balances</span>
              <span className="text-xs font-bold text-on-surface">
                {formatCurrency(totalAvailableSimulated)}
              </span>
            </div>

            {/* Total Escrow Held */}
            <div className="flex justify-between items-center pb-3.5 border-b border-outline-variant/30">
              <span className="text-xs text-secondary">Currently Held Escrow</span>
              <span className="text-xs font-bold text-on-surface">
                {formatCurrency(totalHeldEscrowSimulated)}
              </span>
            </div>

            {/* Total Funded (Simulation) */}
            <div className="flex justify-between items-center pb-3.5 border-b border-outline-variant/30">
              <span className="text-xs text-secondary">Cumulative Escrow Funded</span>
              <span className="text-xs font-bold text-success">
                {formatCurrency(totalFundedSimulated)}
              </span>
            </div>

            {/* Total Released (Simulation) */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-secondary">Cumulative Escrow Released</span>
              <span className="text-xs font-bold text-primary">
                {formatCurrency(totalReleasedSimulated)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
