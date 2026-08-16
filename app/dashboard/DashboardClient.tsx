"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction } from "@/app/auth/actions";

export interface DashboardClientProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string;
    role: "client" | "freelancer";
    verification_status: "pending" | "verified";
  };
  userEmail: string;
  children: React.ReactNode;
}

export default function DashboardClient({
  profile,
  userEmail,
  children,
}: DashboardClientProps) {
  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "";

  return (
    <AppShell
      activeRole={profile.role}
      activeMenuLabel="Overview"
      userName={profile.full_name}
      userEmail={userEmail}
      userInitials={initials}
      userAvatarUrl={profile.avatar_url}
      onSignOut={async () => {
        await signOutAction();
      }}
    >
      {children}
    </AppShell>
  );
}
