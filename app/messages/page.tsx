import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessagesClient, { MessageProject } from "./MessagesClient";

export default async function MessagesPage() {
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

  // 3. Fetch projects the user is involved in
  interface DbProfile {
    id: string;
    full_name: string;
    avatar_url: string | null;
  }

  interface DbProjectMember {
    profiles: DbProfile | DbProfile[] | null;
  }

  interface ProjectQueryResult {
    id: string;
    title: string;
    category: string;
    status: string;
    project_members: DbProjectMember[];
  }

  let projectsData: ProjectQueryResult[] = [];
  if (profile.role === "client") {
    const { data } = await supabase
      .from("projects")
      .select(`
        id,
        title,
        category,
        status,
        project_members(
          profiles(id, full_name, avatar_url)
        )
      `)
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });
    projectsData = (data as unknown as ProjectQueryResult[]) || [];
  } else {
    const { data } = await supabase
      .from("project_members")
      .select(`
        project_id,
        project:projects(
          id,
          title,
          category,
          status,
          project_members(
            profiles(id, full_name, avatar_url)
          )
        )
      `)
      .eq("user_id", user.id);
    projectsData = (((data || []) as unknown as { project: ProjectQueryResult }[])
      .map((d) => d.project)
      .filter(Boolean));
  }

  // 4. Resolve the latest message snippet and sender details for each project chat group
  const formattedProjects: MessageProject[] = await Promise.all(
    projectsData.map(async (p: ProjectQueryResult) => {
      // Fetch latest message
      const { data: latestMsg } = await supabase
        .from("messages")
        .select(`
          content,
          created_at,
          profiles:sender_id(full_name)
        `)
        .eq("project_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const teamMembers = (p.project_members || []).map((m: DbProjectMember) => {
        const rawProf = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          id: rawProf?.id || "",
          full_name: rawProf?.full_name || "Unknown Member",
          avatar_url: rawProf?.avatar_url || null,
        };
      });

      const msgProf = latestMsg?.profiles as DbProfile | DbProfile[] | null;
      const senderName = Array.isArray(msgProf) ? msgProf[0]?.full_name : msgProf?.full_name;

      return {
        id: p.id,
        title: p.title,
        category: p.category || "General",
        status: p.status,
        teamMembers,
        latestMessage: latestMsg
          ? {
              content: latestMsg.content,
              created_at: latestMsg.created_at,
              sender_name: senderName || "Someone",
            }
          : null,
      };
    })
  );

  return (
    <MessagesClient
      profile={profile}
      userEmail={user.email || ""}
      projects={formattedProjects}
    />
  );
}
