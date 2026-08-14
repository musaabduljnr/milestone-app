"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction, selectRoleAction } from "@/app/auth/actions";
import { updateProfileSettings } from "./actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";

interface SettingsClientProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role: "client" | "freelancer";
    verification_status: "pending" | "verified";
  };
  userEmail: string;
}

const PREDEFINED_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
];

export default function SettingsClient({
  profile,
  userEmail,
}: SettingsClientProps) {
  const [role, setRole] = React.useState<"client" | "freelancer">(profile.role);
  const [isPending, startTransition] = React.useTransition();

  // Form states
  const [fullName, setFullName] = React.useState(profile.full_name || "");
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatar_url || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await updateProfileSettings(fullName, avatarUrl);
      if (res.success) {
        setSuccessMsg("Profile settings updated successfully!");
        // Clear message after delay
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(res.error || "Failed to update profile.");
      }
    } catch {
      setErrorMsg("A network error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "";

  return (
    <AppShell
      activeRole={role}
      onRoleSwitch={handleRoleSwitch}
      activeMenuLabel="Settings"
      userName={fullName}
      userEmail={userEmail}
      userInitials={initials}
      userAvatarUrl={avatarUrl || undefined}
      onSignOut={signOutAction}
    >
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Header Block banner */}
        <div>
          <h1 className="font-headline-lg text-display-sm-mobile md:text-headline-lg font-bold text-on-surface">
            Profile Settings
          </h1>
          <p className="font-body-sm text-xs text-muted-foreground mt-1">
            Update your account display name, choose a verified avatar, and view security roles.
          </p>
        </div>

        {/* Notices */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-success-container/10 border border-success/15 text-success text-xs font-semibold leading-normal flex items-start gap-2.5 select-none">
            <span className="material-symbols-outlined text-success text-[16px] mt-0.5">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-error-container/15 border border-error/15 text-error text-xs font-semibold leading-normal flex items-start gap-2.5 select-none">
            <span className="material-symbols-outlined text-error text-[16px] mt-0.5">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Main settings form */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <Card className="p-6">
              <form onSubmit={handleSave} className="flex flex-col gap-6">
                <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider border-b border-outline-variant/30 pb-2">
                  Personal Profile
                </h3>

                {/* Display Initials Demo */}
                <div className="flex items-center gap-4 select-none">
                  <Avatar
                    src={avatarUrl || undefined}
                    initials={initials || "U"}
                    size="lg"
                    className="ring-2 ring-primary/10"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-on-surface">Avatar Preview</span>
                    <span className="text-[10px] text-muted-foreground">Select one of our curated faces below.</span>
                  </div>
                </div>

                {/* Predefined Avatars List */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                    Select Avatar Picture
                  </label>
                  <div className="flex items-center gap-3.5 flex-wrap">
                    {PREDEFINED_AVATARS.map((url, idx) => {
                      const isActive = avatarUrl === url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatarUrl(url)}
                          className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                            isActive
                              ? "border-primary ring-2 ring-primary/20 scale-110 shadow-subtle"
                              : "border-outline-variant hover:border-outline"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Avatar face option ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl("")}
                        className="text-[10px] text-muted-foreground font-semibold border border-outline-variant/50 hover:border-outline px-2.5 py-1.5 rounded-md hover:text-on-surface transition-colors"
                      >
                        Reset to Initials
                      </button>
                    )}
                  </div>
                </div>

                {/* Display Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block">
                    Display Name
                  </label>
                  <Input
                    placeholder="Enter your full name..."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {/* Email Address Static */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block">
                    Email Address
                  </label>
                  <Input
                    value={userEmail}
                    disabled
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Authentication emails are locked and managed securely by Supabase.
                  </span>
                </div>

                <div className="pt-4 border-t border-outline-variant/35 flex justify-end">
                  <Button variant="primary" type="submit" disabled={isSaving} className="min-w-32">
                    {isSaving ? <Spinner size="sm" /> : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Quick info column */}
          <div className="flex flex-col gap-6">
            {/* KYC status card */}
            <Card className="p-6 flex flex-col gap-4">
              <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider border-b border-outline-variant/30 pb-2">
                Identity status
              </h3>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Status</span>
                  <div className="flex items-center">
                    <Badge variant={profile.verification_status === "verified" ? "success" : "neutral"}>
                      {profile.verification_status}
                    </Badge>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  {profile.verification_status === "verified"
                    ? "Your identity is verified. You have full access to deposit, lock escrow, and request payments."
                    : "Identity check is required before you can participate in milestone contract payments."}
                </div>

                {profile.verification_status !== "verified" && (
                  <Link href="/verification" className="w-full mt-2">
                    <Button variant="secondary" className="w-full" size="sm">
                      Get Verified
                    </Button>
                  </Link>
                )}
              </div>
            </Card>

            {/* Sandbox Notice info */}
            <Card className="p-6 flex flex-col gap-3.5 bg-surface-container-low border border-outline-variant/35">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">info</span>
                <span className="text-xs font-bold text-primary">Simulated Sandbox</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                All profile parameters, wallet currencies, and verification triggers in this account workspace are fully simulated mock actions for demonstration.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
