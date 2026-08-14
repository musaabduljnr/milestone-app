import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VerificationClient from "./VerificationClient";

export default async function VerificationPage() {
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

  // Guard: require account role selection first
  if (!profile.role) {
    redirect("/auth/role-selection");
  }

  // Serialize profile details securely
  const profileData = {
    id: profile.id,
    full_name: profile.full_name || "",
    role: profile.role as "client" | "freelancer",
    verification_status: profile.verification_status as "pending" | "verified",
    date_of_birth: profile.date_of_birth || "",
    photo_id_path: profile.photo_id_path || "",
    verification_started_at: profile.verification_started_at || null,
  };

  return (
    <VerificationClient
      profile={profileData}
      userEmail={user.email || ""}
    />
  );
}
