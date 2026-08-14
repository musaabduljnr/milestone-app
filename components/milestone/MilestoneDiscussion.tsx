"use client";

import React from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { sendMessage } from "@/app/notifications/actions";

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

interface MilestoneDiscussionProps {
  projectId: string;
  milestoneId: string;
  milestoneTitle: string;
  milestoneStatus: string;
  activeRole?: "client" | "freelancer";
}

export const MilestoneDiscussion: React.FC<MilestoneDiscussionProps> = ({
  projectId,
  milestoneId,
  milestoneTitle,
  milestoneStatus,
}) => {
  const [messages, setMessages] = React.useState<DiscussionMessage[]>([]);
  const [profileCache, setProfileCache] = React.useState<Record<string, { full_name: string; avatar_url: string | null }>>({});
  const [newContent, setNewContent] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 1. Initial Load
  React.useEffect(() => {
    const initChat = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        // Fetch milestone-specific messages
        const { data: msgs, error } = await supabase
          .from("messages")
          .select("id, content, created_at, sender_id, profiles(full_name, avatar_url)")
          .eq("milestone_id", milestoneId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        
        if (msgs) {
          // Cast msgs to DiscussionMessage[] since we selected profiles
          const typedMsgs = msgs as unknown as DiscussionMessage[];
          setMessages(typedMsgs);
          // Seed profileCache
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
        console.error("Failed to load milestone discussion:", err);
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    initChat();
  }, [milestoneId, supabase]);

  // 2. Real-time Subscription
  React.useEffect(() => {
    if (loading) return;

    const channel = supabase
      .channel(`milestone-discussion-${milestoneId}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `milestone_id=eq.${milestoneId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new as Record<string, unknown>;
          
          // Verify if we already have it to prevent duplicates
          if (messages.some((m) => m.id === (newMsg.id as string))) return;

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
  }, [milestoneId, loading, messages, profileCache, supabase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || sending) return;

    setSending(true);
    const contentToSend = newContent.trim();
    setNewContent("");

    try {
      const res = await sendMessage(projectId, milestoneId, contentToSend);
      if (!res.success) {
        console.error("Failed to send message:", res.error);
        setNewContent(contentToSend); // Restore
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setNewContent(contentToSend);
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  return (
    <Card className="flex flex-col border border-outline-variant/35 h-96 mt-4 select-none">
      {/* Discussion Subheader */}
      <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low shrink-0 select-none">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
            Milestone Discussion Context
          </span>
          <h4 className="text-xs font-bold text-on-surface truncate max-w-xs sm:max-w-md">
            {milestoneTitle}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium">Status:</span>
          <span className="text-[9px] bg-outline-variant/40 text-on-surface font-semibold px-2 py-0.5 rounded-full select-none capitalize">
            {milestoneStatus.toLowerCase().replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {milestoneStatus === "DISPUTED" && (
        <div className="bg-error-container/10 border-b border-error/15 px-4 py-2 flex items-center gap-2 text-error text-[10.5px] font-medium leading-relaxed shrink-0">
          <span className="material-symbols-outlined text-[15px] select-none">info</span>
          <span>
            This milestone is currently under dispute. All messages here are recorded as part of the dispute resolution process.
          </span>
        </div>
      )}

      {/* Message History Canvas */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="sm" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground p-6 select-none">
            <span className="material-symbols-outlined text-[26px]">chat_bubble_outline</span>
            <span className="text-xs font-semibold text-secondary">Start the conversation</span>
            <p className="text-[10px] text-muted-foreground leading-normal max-w-xs">
              Leave a note for the other party regarding specs, requirements, or approvals.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUserId;
            const initials = m.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2) || "S";
            const formattedTime = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <div
                key={m.id}
                className={`flex gap-3 items-start max-w-[85%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
              >
                <Avatar
                  src={m.profiles?.avatar_url || undefined}
                  initials={initials}
                  size="sm"
                  className={isMe ? "bg-primary text-white" : "bg-outline-variant/30 text-secondary"}
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
                    className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
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

      {/* Message Composer Area */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-outline-variant/20 bg-surface-container-lowest flex gap-2.5 items-end shrink-0"
      >
        <Textarea
          placeholder="Type a message regarding this milestone..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={1}
          className="font-sans text-xs focus:ring-primary focus:border-primary resize-none flex-1 min-h-[38px] max-h-[120px] py-2"
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
          className="h-9 px-4 shrink-0 flex items-center justify-center cursor-pointer"
        >
          {sending ? <Spinner size="sm" className="text-on-primary" /> : "Send"}
        </Button>
      </form>
    </Card>
  );
};
