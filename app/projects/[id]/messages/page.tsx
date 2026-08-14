import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectMessagesClient } from "./ProjectMessagesClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectMessagesPage({ params }: PageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/auth/login");
  }

  // 2. Fetch project details
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id, category, status, currency")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect("/dashboard");
  }

  // 3. Check membership
  const isOwner = project.client_id === user.id;
  let memberRole: "client" | "freelancer" | null = null;
  if (isOwner) {
    memberRole = "client";
  } else {
    const { data: member } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();
    if (member) {
      memberRole = member.role as "client" | "freelancer";
    }
  }

  if (!memberRole) {
    // Non-member unauthorized access block
    redirect("/dashboard");
  }

  // 4. Fetch profile mapping for current user
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <ProjectMessagesClient
      project={project}
      currentUser={{
        id: user.id,
        email: user.email!,
        full_name: profile?.full_name || "Someone",
        avatar_url: profile?.avatar_url || null,
        role: memberRole,
      }}
    />
  );
}
