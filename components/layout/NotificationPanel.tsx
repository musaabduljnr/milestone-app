import React from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Notification, NotificationItem } from "./NotificationItem";

interface NotificationPanelProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAllRead: () => void;
  onItemClick: (notif: Notification) => void;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  loading,
  onMarkAllRead,
  onItemClick,
  onClose,
}) => {
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <Card className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[480px] overflow-hidden shadow-elevated border-outline-variant/30 flex flex-col z-50 bg-surface text-on-surface select-none">
      {/* Panel Header */}
      <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-headline-sm text-body-sm font-bold">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold select-none animate-pulse">
              {unreadCount} New
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-on-surface cursor-pointer w-6 h-6 flex items-center justify-center rounded-full hover:bg-outline-variant/10"
            aria-label="Close panel"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {/* Notifications scroll list */}
      <div className="flex-1 overflow-y-auto min-h-[120px] max-h-[380px]">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Spinner size="sm" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2 px-6">
            <span className="material-symbols-outlined text-[24px] text-muted-foreground">notifications_off</span>
            <span className="text-xs font-semibold text-secondary">All caught up!</span>
            <p className="text-[10px] text-muted-foreground leading-normal">
              No recent alerts or messages received.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notif) => (
              <NotificationItem key={notif.id} notification={notif} onClick={onItemClick} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
