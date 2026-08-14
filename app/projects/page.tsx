import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectsClient from "./ProjectsClient";

export interface DbProjectMember {
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface DbMilestone {
  id: string;
  status: string;
}

export interface DbProject {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  currency: string;
  status: "draft" | "in_progress" | "completed" | "disputed";
  expected_completion?: string | null;
  milestones: DbMilestone[];
  project_members: DbProjectMember[];
  created_at: string;
}

export default async function ProjectsPage() {
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

  // 3. Fetch projects based on role
  let rawProjects: DbProject[] = [];
  if (profile.role === "client") {
    const { data } = await supabase
      .from("projects")
      .select(`
        *,
        milestones(*),
        project_members(
          user_id,
          role,
          profiles(full_name, avatar_url)
        )
      `)
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });
    rawProjects = (data || []) as unknown as DbProject[];
  } else {
    const { data } = await supabase
      .from("project_members")
      .select(`
        project_id,
        projects(
          *,
          milestones(*),
          project_members(
            user_id,
            role,
            profiles(full_name, avatar_url)
          )
        )
      `)
      .eq("user_id", user.id);
    rawProjects = ((data || []).map((d) => d.projects).filter(Boolean)) as unknown as DbProject[];
  }

  return (
    <ProjectsClient
      profile={profile}
      userEmail={user.email || ""}
      initialProjects={rawProjects}
    />
  );
}
