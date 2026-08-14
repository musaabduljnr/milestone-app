"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconButton } from "@/components/ui/IconButton";
import { Notification } from "./NotificationItem";
import { NotificationPanel } from "./NotificationPanel";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/notifications/actions";

interface NotificationBellProps {
  activeRole: "client" | "freelancer";
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ activeRole }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // 1. Resolve user ID on mount & fetch alerts
  React.useEffect(() => {
    const fetchUserAndAlerts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const res = await getNotifications();
          if (res.success && res.data) {
            setNotifications(res.data as unknown as Notification[]);
          }
        }
      } catch (err) {
        console.error("Failed to load initial notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndAlerts();

    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [supabase]);

  // 2. Real-time updates subscription
  React.useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-alerts-${userId}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const handleMarkAllRead = async () => {
    try {
      const res = await markAllNotificationsRead();
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
        );
      }
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleItemClick = async (notif: Notification) => {
    setIsOpen(false);
    // Mark as read
    if (!notif.read_at) {
      try {
        const res = await markNotificationRead(notif.id);
        if (res.success) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
          );
        }
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }

    // Navigate to path
    if (notif.milestone_id) {
      if (activeRole === "freelancer") {
        router.push(`/freelancer/milestones/${notif.milestone_id}`);
      } else {
        router.push(`/projects/${notif.project_id}`);
      }
    } else if (notif.project_id) {
      router.push(`/projects/${notif.project_id}`);
    } else if (notif.type.includes("VERIFICATION")) {
      router.push("/verification");
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative inline-block cursor-pointer">
        <IconButton
          iconName="notifications"
          ariaLabel="View notifications"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center pointer-events-none ring-2 ring-surface select-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      {isOpen && (
        <NotificationPanel
          notifications={notifications}
          loading={loading}
          onMarkAllRead={handleMarkAllRead}
          onItemClick={handleItemClick}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
