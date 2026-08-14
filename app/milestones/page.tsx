import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MilestonesClient from "./MilestonesClient";

export interface MilestoneItem {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_freelancer_id: string | null;
  payout_amount: number;
  deadline: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "PAID" | "DISPUTED";
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  project: {
    id: string;
    title: string;
    currency: string;
  } | null;
}

export default async function MilestonesPage() {
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

  // 3. Fetch milestones with associated project titles
  let rawMilestones: MilestoneItem[] = [];
  if (profile.role === "client") {
    const { data } = await supabase
      .from("milestones")
      .select(`
        *,
        project:projects!inner(id, title, client_id, currency)
      `)
      .eq("projects.client_id", user.id)
      .order("created_at", { ascending: false });
    rawMilestones = (data || []) as unknown as MilestoneItem[];
  } else {
    const { data } = await supabase
      .from("milestones")
      .select(`
        *,
        project:projects(id, title, currency)
      `)
      .eq("assigned_freelancer_id", user.id)
      .order("created_at", { ascending: false });
    rawMilestones = (data || []) as unknown as MilestoneItem[];
  }

  return (
    <MilestonesClient
      profile={profile}
      userEmail={user.email || ""}
      initialMilestones={rawMilestones}
    />
  );
}
