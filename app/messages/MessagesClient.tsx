"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction, selectRoleAction } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export interface MessageProject {
  id: string;
  title: string;
  category: string;
  status: string;
  teamMembers: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  }[];
  latestMessage: {
    content: string;
    created_at: string;
    sender_name: string;
  } | null;
}

interface MessagesClientProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role: "client" | "freelancer";
    verification_status: "pending" | "verified";
  };
  userEmail: string;
  projects: MessageProject[];
}

export default function MessagesClient({
  profile,
  userEmail,
  projects,
}: MessagesClientProps) {
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
      activeMenuLabel="Messages"
      userName={profile.full_name}
      userEmail={userEmail}
      userInitials={initials}
      userAvatarUrl={profile.avatar_url || undefined}
      onSignOut={signOutAction}
    >
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Header Block banner */}
        <div>
          <h1 className="font-headline-lg text-display-sm-mobile md:text-headline-lg font-bold text-on-surface">
            Project Discussions
          </h1>
          <p className="font-body-sm text-xs text-muted-foreground mt-1">
            Access secure discussion threads, review comments, and send attachments in project chats.
          </p>
        </div>

        {/* Chats list */}
        {projects.length === 0 ? (
          <Card className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest border border-outline-variant/30">
            <div className="w-12 h-12 rounded-full bg-surface-container-high text-muted-foreground flex items-center justify-center mb-4 border border-outline-variant/40">
              <span className="material-symbols-outlined text-[28px]">chat</span>
            </div>
            <h3 className="font-headline-sm text-body-base font-bold text-on-surface">
              No active discussions
            </h3>
            <p className="font-body-sm text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed">
              Discussions will appear here once you are assigned to a contract or create a project.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {projects.map((p) => {
              // Format timestamp
              const timeString = p.latestMessage
                ? new Date(p.latestMessage.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <Card
                  key={p.id}
                  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-outline-variant/30 hover:border-outline-variant transition-all bg-surface-container-lowest shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-label-caps text-[9px] font-bold text-primary uppercase tracking-wider block">
                        {p.category}
                      </span>
                      <Badge variant={p.status === "completed" ? "success" : "neutral"}>
                        {p.status}
                      </Badge>
                    </div>

                    <h3 className="font-body-base text-body-sm font-bold text-on-surface mt-1.5 leading-snug truncate">
                      {p.title}
                    </h3>

                    {/* Chat preview text snippet */}
                    {p.latestMessage ? (
                      <p className="text-xs text-secondary mt-1.5 line-clamp-1 leading-normal">
                        <strong className="text-on-surface font-semibold">
                          {p.latestMessage.sender_name}
                        </strong>
                        : {p.latestMessage.content}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">
                        No messages yet. Open chat to start the discussion!
                      </p>
                    )}

                    {/* Team Members stack avatars list */}
                    <div className="flex items-center gap-2 mt-4 select-none">
                      <span className="text-[10px] text-muted-foreground font-semibold">Members:</span>
                      <div className="flex -space-x-2">
                        {p.teamMembers.slice(0, 4).map((m) => {
                          const mInitials = m.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase();
                          return (
                            <Avatar
                              key={m.id}
                              src={m.avatar_url || undefined}
                              initials={mInitials}
                              size="sm"
                              className="border-2 border-surface bg-surface-container-high text-[9px] font-bold"
                            />
                          );
                        })}
                      </div>
                      {p.teamMembers.length > 4 && (
                        <span className="text-[9px] text-muted-foreground font-bold">
                          +{p.teamMembers.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t border-outline-variant/10 md:border-none">
                    <span className="text-[10px] text-muted-foreground font-data-mono font-medium shrink-0">
                      {timeString}
                    </span>
                    <Link href={`/projects/${p.id}/messages`} className="shrink-0">
                      <Button variant="primary" size="sm">
                        Open Chat
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
