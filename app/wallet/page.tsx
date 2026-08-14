import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WalletClient, { LedgerItem } from "./WalletClient";

export default async function WalletPage() {
  const supabase = await createClient();

  // 1. Resolve user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 2. Fetch profile role metadata
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  // Intercept role bypasses
  if (!profile.role) {
    redirect("/auth/role-selection");
  }

  // 3. Fetch wallet details
  const { data: wallet } = await supabase
    .from("wallets")
    .select("available_balance, pending_balance")
    .eq("user_id", user.id)
    .single();

  // 4. Fetch escrow ledger audit trails
  interface DbLedgerItem {
    id: string;
    amount: number;
    entry_type: "FUNDED" | "HELD" | "RELEASED";
    status: "completed" | "secured" | "processing" | "failed";
    created_at: string;
    projects: unknown;
    milestones: unknown;
  }

  let ledgerData: DbLedgerItem[] = [];
  if (profile.role === "client") {
    const { data } = await supabase
      .from("escrow_ledger")
      .select(`
        id,
        amount,
        entry_type,
        status,
        created_at,
        projects!inner(client_id, title),
        milestones(title)
      `)
      .eq("projects.client_id", user.id)
      .order("created_at", { ascending: false });
    ledgerData = data || [];
  } else {
    const { data } = await supabase
      .from("escrow_ledger")
      .select(`
        id,
        amount,
        entry_type,
        status,
        created_at,
        projects(title),
        milestones!inner(assigned_freelancer_id, title)
      `)
      .eq("milestones.assigned_freelancer_id", user.id)
      .order("created_at", { ascending: false });
    ledgerData = data || [];
  }

  // Format database response objects to strictly typed LedgerItem records
  const formattedLedger: LedgerItem[] = ledgerData.map((item) => {
    // Resolve project/milestone titles depending on structure
    const rawProject = (Array.isArray(item.projects) ? item.projects[0] : item.projects) as { title: string } | null;
    const rawMilestone = (Array.isArray(item.milestones) ? item.milestones[0] : item.milestones) as { title: string } | null;

    return {
      id: item.id,
      project_title: rawProject?.title || "Unknown Project",
      milestone_title: rawMilestone?.title || "Unknown Milestone",
      amount: Number(item.amount),
      entry_type: item.entry_type,
      status: item.status,
      created_at: item.created_at,
    };
  });

  return (
    <WalletClient
      profile={profile}
      userEmail={user.email || ""}
      wallet={wallet}
      ledger={formattedLedger}
    />
  );
}
