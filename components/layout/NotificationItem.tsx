import React from "react";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  project_id: string | null;
  milestone_id: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationItemProps {
  notification: Notification;
  onClick: (notif: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
  const isUnread = !notification.read_at;
  
  let icon = "info";
  let iconColor = "text-primary";
  let bgClass = "bg-primary-container/10";
  
  if (notification.type === "NEW_MESSAGE") {
    icon = "chat";
    iconColor = "text-primary";
    bgClass = "bg-primary-container/15";
  } else if (notification.type.includes("APPROV") || notification.type.includes("RELEASE") || notification.type.includes("PAID")) {
    icon = "check_circle";
    iconColor = "text-success";
    bgClass = "bg-success-container/10";
  } else if (notification.type.includes("STARTED")) {
    icon = "play_arrow";
    iconColor = "text-info";
    bgClass = "bg-info-container/10";
  } else if (notification.type.includes("SUBMIT")) {
    icon = "publish";
    iconColor = "text-warning";
    bgClass = "bg-warning-container/10";
  } else if (notification.type.includes("DISPUTE")) {
    icon = "gavel";
    iconColor = "text-error";
    bgClass = "bg-error-container/10";
  } else if (notification.type.includes("DEADLINE") || notification.type.includes("OVERDUE")) {
    icon = "alarm";
    iconColor = "text-error animate-pulse";
    bgClass = "bg-error-container/10";
  }
  
  const formattedDate = new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + new Date(notification.created_at).toLocaleDateString();

  return (
    <div
      onClick={() => onClick(notification)}
      className={`p-3.5 flex gap-3 items-start border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors cursor-pointer select-none ${
        isUnread ? "bg-primary-container/5 border-l-2 border-l-primary" : ""
      }`}
    >
      <div className={`w-8 h-8 rounded-full ${bgClass} ${iconColor} flex items-center justify-center shrink-0`}>
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
      </div>
      
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex justify-between items-start gap-2">
          <span className={`text-xs truncate ${isUnread ? "font-bold text-on-surface" : "font-semibold text-secondary"}`}>
            {notification.title}
          </span>
          <span className="text-[9px] text-muted-foreground shrink-0 font-medium">{formattedDate}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">
          {notification.message}
        </p>
      </div>
      
      {isUnread && (
        <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 self-center" />
      )}
    </div>
  );
};
