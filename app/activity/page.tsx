import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActivityClient from "./ActivityClient";

export default async function ActivityPage() {
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

  // 3. Resolve user projects list
  let userProjectIds: string[] = [];
  if (profile.role === "client") {
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("client_id", user.id);
    userProjectIds = (data || []).map((p) => p.id);
  } else {
    const { data } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id);
    userProjectIds = (data || []).map((d) => d.project_id);
  }

  if (userProjectIds.length === 0) {
    return (
      <ActivityClient
        profile={profile}
        userEmail={user.email || ""}
        initialData={{
          projects: [],
          members: [],
          milestones: [],
          escrow: [],
          disputes: [],
        }}
      />
    );
  }

  // 4. Fetch all related entities in parallel
  const [
    { data: projects },
    { data: members },
    { data: milestones },
    { data: escrow },
    { data: disputes },
    { data: invitations },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, created_at, currency")
      .in("id", userProjectIds),
    supabase
      .from("project_members")
      .select("id, project_id, role, created_at, profiles(full_name)")
      .in("project_id", userProjectIds),
    supabase
      .from("milestones")
      .select("id, project_id, title, payout_amount, created_at, submitted_at, approved_at, paid_at")
      .in("project_id", userProjectIds),
    supabase
      .from("escrow_ledger")
      .select("id, project_id, amount, entry_type, created_at")
      .in("project_id", userProjectIds),
    supabase
      .from("disputes")
      .select("id, milestone_id, reason, status, resolution, created_at, resolved_at")
      .in("milestone_id", [
        // Find milestones of these projects
        ...(await supabase
          .from("milestones")
          .select("id")
          .in("project_id", userProjectIds)
          .then((res) => (res.data || []).map((m) => m.id))),
      ]),
    supabase
      .from("project_invitations")
      .select("id, project_id, milestone_id, invitee_email, status, created_at, responded_at, invitee:invitee_user_id(full_name), milestone:milestone_id(title)")
      .in("project_id", userProjectIds),
  ]);

  return (
    <ActivityClient
      profile={profile}
      userEmail={user.email || ""}
      initialData={{
        projects: projects || [],
        members: members || [],
        milestones: milestones || [],
        escrow: escrow || [],
        disputes: disputes || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        invitations: (invitations || []) as any,
      }}
    />
  );
}
