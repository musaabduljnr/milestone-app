"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction, selectRoleAction } from "@/app/auth/actions";

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
  const [role, setRole] = React.useState<"client" | "freelancer">(profile.role);
  const [isPending, startTransition] = React.useTransition();

  const handleRoleSwitch = (newRole: "client" | "freelancer") => {
    if (isPending) return;
    setRole(newRole);
    startTransition(async () => {
      try {
        await selectRoleAction(newRole);
      } catch (err) {
        console.error("Failed to switch database profile role:", err);
      }
    });
  };

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "";

  return (
    <AppShell
      activeRole={role}
      onRoleSwitch={handleRoleSwitch}
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
