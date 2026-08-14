import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateProjectWizard from "./CreateProjectWizard";
import { getFreelancers } from "@/app/projects/actions";

export default async function NewProjectPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client") {
    redirect("/dashboard?error=Unauthorized: Only clients can create projects.");
  }

  const freelancers = await getFreelancers();

  // Convert schema response structure to match FreelancerProfile interface
  const formattedFreelancers = freelancers.map((f) => ({
    id: f.id,
    full_name: f.full_name,
    avatar_url: f.avatar_url || null,
  }));

  return (
    <CreateProjectWizard
      freelancers={formattedFreelancers}
      userEmail={user.email || ""}
      profileName={profile.full_name || user.email || ""}
    />
  );
}
