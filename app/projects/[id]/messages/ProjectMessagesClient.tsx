"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/notifications/actions";
import { signOutAction } from "@/app/auth/actions";

interface DiscussionMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ProjectMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface ProjectMessagesClientProps {
  project: {
    id: string;
    title: string;
    client_id: string;
    category: string | null;
    status: string;
    currency: string;
  };
  currentUser: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    role: "client" | "freelancer";
  };
}

export const ProjectMessagesClient: React.FC<ProjectMessagesClientProps> = ({
  project,
  currentUser,
}) => {
  const [messages, setMessages] = React.useState<DiscussionMessage[]>([]);
  const [membersList, setMembersList] = React.useState<ProjectMember[]>([]);
  const [profileCache, setProfileCache] = React.useState<Record<string, { full_name: string; avatar_url: string | null }>>({});
  const [newContent, setNewContent] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 1. Initial Fetch
  React.useEffect(() => {
    const initChat = async () => {
      try {
        // Fetch project members and client
        const { data: pmList } = await supabase
          .from("project_members")
          .select("id, role, user_id, profiles(id, full_name, avatar_url)")
          .eq("project_id", project.id);

        const { data: owner } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", project.client_id)
          .single();

        interface RawMemberResult {
          id: string;
          role: string;
          user_id: string;
          profiles: { id: string; full_name: string; avatar_url: string | null } | { id: string; full_name: string; avatar_url: string | null }[] | null;
        }

        const formattedMembers: ProjectMember[] = [];
        if (owner) {
          formattedMembers.push({
            id: owner.id,
            full_name: owner.full_name,
            avatar_url: owner.avatar_url,
            role: "client",
          });
        }
        const typedMems = (pmList || []) as unknown as RawMemberResult[];
        typedMems.forEach((m) => {
          const rawProf = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          if (rawProf && rawProf.id !== project.client_id) {
            formattedMembers.push({
              id: rawProf.id,
              full_name: rawProf.full_name,
              avatar_url: rawProf.avatar_url,
              role: m.role,
            });
          }
        });
        setMembersList(formattedMembers);

        // Fetch messages where milestone_id IS NULL
        const { data: msgs, error } = await supabase
          .from("messages")
          .select("id, content, created_at, sender_id, profiles(full_name, avatar_url)")
          .eq("project_id", project.id)
          .is("milestone_id", null)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (msgs) {
          const typedMsgs = msgs as unknown as DiscussionMessage[];
          setMessages(typedMsgs);
          const cache: Record<string, { full_name: string; avatar_url: string | null }> = {};
          typedMsgs.forEach((m) => {
            if (m.profiles) {
              const rawProf = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              cache[m.sender_id] = rawProf as { full_name: string; avatar_url: string | null };
            }
          });
          setProfileCache(cache);
        }
      } catch (err) {
        console.error("Failed to load project discussion:", err);
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    initChat();
  }, [project.id, project.client_id, supabase]);

  // 2. Real-time Subscription
  React.useEffect(() => {
    if (loading) return;

    const channel = supabase
      .channel(`project-chat-${project.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `project_id=eq.${project.id}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (payload: any) => {
          const newMsg = payload.new as Record<string, unknown>;
          // Filter out milestone-specific messages and check duplicates
          if (newMsg.milestone_id || messages.some((m) => m.id === (newMsg.id as string))) return;

          // Resolve sender profile
          const senderId = newMsg.sender_id as string;
          let senderProfile = profileCache[senderId];
          if (!senderProfile) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", senderId)
              .single();
            if (prof) {
              senderProfile = prof;
              setProfileCache((prev) => ({ ...prev, [senderId]: prof }));
            }
          }

          const msgWithProfile: DiscussionMessage = {
            id: newMsg.id as string,
            content: newMsg.content as string,
            created_at: newMsg.created_at as string,
            sender_id: senderId,
            profiles: senderProfile || { full_name: "Someone", avatar_url: null },
          };

          setMessages((prev) => [...prev, msgWithProfile]);
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project.id, loading, messages, profileCache, supabase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || sending) return;

    setSending(true);
    const contentToSend = newContent.trim();
    setNewContent("");

    try {
      const res = await sendMessage(project.id, null, contentToSend);
      if (!res.success) {
        console.error("Failed to send project message:", res.error);
        setNewContent(contentToSend); // Restore
      }
    } catch (err) {
      console.error("Error sending project message:", err);
      setNewContent(contentToSend);
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  return (
    <AppShell
      activeRole={currentUser.role}
      activeMenuLabel="Projects"
      userName={currentUser.full_name}
      userEmail={currentUser.email}
      userAvatarUrl={currentUser.avatar_url || undefined}
      onSignOut={signOutAction}
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider select-none">
          <span>Projects</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span>{project.title}</span>
          <span className="material-symbols-outlined text-[12px]">chevron_right</span>
          <span className="text-primary">Chat Room</span>
        </div>

        {/* Header block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-primary font-bold uppercase tracking-wider">
              {project.category || "General Context"}
            </span>
            <h1 className="font-headline-lg text-headline-sm md:text-headline-lg font-bold text-on-surface mt-1.5">
              {project.title}
            </h1>
          </div>
          <Badge variant={project.status === "completed" ? "success" : "neutral"}>
            {project.status}
          </Badge>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-outline-variant/30 pb-1.5 select-none">
          <Link
            href={`/projects/${project.id}`}
            className="text-xs font-medium text-muted-foreground hover:text-on-surface pb-2 transition-colors"
          >
            Overview & Stepper
          </Link>
          <span className="text-xs font-bold text-primary border-b-2 border-primary pb-2 cursor-default">
            Project Chat & Discussion
          </span>
        </div>

        {/* 2-Column Responsive Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Column A: Members Directory (Desktop visible) */}
          <div className="lg:col-span-1 flex flex-col gap-4 shrink-0">
            <Card className="p-4 border border-outline-variant/35 flex flex-col gap-4 select-none">
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider border-b border-outline-variant/20 pb-2">
                Discussion Members ({membersList.length})
              </span>
              <div className="flex flex-col gap-3">
                {membersList.map((m) => {
                  const initials = m.full_name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2) || "S";
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <Avatar
                        src={m.avatar_url || undefined}
                        initials={initials}
                        size="sm"
                        className={m.role === "client" ? "bg-primary text-white" : "bg-outline-variant/20 text-secondary"}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-on-surface truncate">
                          {m.full_name}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider capitalize">
                          {m.role === "client" ? "Client Owner" : "Freelancer"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Column B: General Chat Box Canvas */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col border border-outline-variant/35 h-[500px] overflow-hidden select-none">
              {/* Box header */}
              <div className="p-4 border-b border-outline-variant/20 bg-surface-container-low flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">chat</span>
                  <span className="text-xs font-bold text-on-surface">General Project Discussion</span>
                </div>
                <span className="text-[9px] bg-primary-container/10 text-primary font-bold px-2 py-0.5 rounded-full select-none uppercase tracking-wide">
                  Realtime Active
                </span>
              </div>

              {/* Chat messages stream */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface-container-lowest">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Spinner size="sm" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground p-6">
                    <span className="material-symbols-outlined text-[32px]">chat</span>
                    <span className="text-sm font-semibold text-secondary">General Chat is Empty</span>
                    <p className="text-xs text-muted-foreground leading-normal max-w-sm">
                      Use this room to coordinate project expectations, milestones setup, or general feedback.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === currentUser.id;
                    const initials = m.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2) || "S";
                    const formattedTime = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 items-start max-w-[80%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
                      >
                        <Avatar
                          src={m.profiles?.avatar_url || undefined}
                          initials={initials}
                          size="sm"
                          className={isMe ? "bg-primary text-white" : "bg-outline-variant/20 text-secondary"}
                        />

                        <div className="flex flex-col gap-1 min-w-0">
                          <div className={`flex items-center gap-2 ${isMe ? "justify-end" : ""}`}>
                            <span className="text-[10px] font-bold text-on-surface truncate">
                              {isMe ? "You" : m.profiles?.full_name || "Someone"}
                            </span>
                            <span className="text-[8px] text-muted-foreground font-medium shrink-0">
                              {formattedTime}
                            </span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                              isMe
                                ? "bg-primary text-white rounded-tr-none"
                                : "bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-tl-none"
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>

              {/* Chat composer form */}
              <form
                onSubmit={handleSend}
                className="p-3.5 border-t border-outline-variant/20 bg-surface flex gap-3 items-end shrink-0"
              >
                <Textarea
                  placeholder="Ask a question or share status updates regarding this project..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={1}
                  className="font-sans text-xs focus:ring-primary focus:border-primary resize-none flex-1 min-h-[40px] max-h-[140px] py-2.5"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  disabled={loading || sending}
                  required
                />
                <Button
                  type="submit"
                  disabled={loading || sending || !newContent.trim()}
                  variant="primary"
                  className="h-10 px-5 shrink-0 flex items-center justify-center cursor-pointer font-semibold text-xs uppercase tracking-wider"
                >
                  {sending ? <Spinner size="sm" className="text-on-primary" /> : "Send"}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
