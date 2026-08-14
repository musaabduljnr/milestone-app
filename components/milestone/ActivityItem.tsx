import React from "react";

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
}

interface ActivityItemProps {
  event: ActivityEvent;
  isLast: boolean;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ event, isLast }) => {
  let icon = "info";
  let iconColor = "text-primary";
  let bgClass = "bg-primary-container/10 border-primary/20";

  switch (event.type) {
    case "CREATE":
      icon = "folder_copy";
      iconColor = "text-primary";
      bgClass = "bg-primary-container/10 border-primary/20";
      break;
    case "ASSIGN":
      icon = "person_add";
      iconColor = "text-secondary";
      bgClass = "bg-secondary-container/10 border-secondary/20";
      break;
    case "FUND":
      icon = "account_balance_wallet";
      iconColor = "text-success";
      bgClass = "bg-success-container/10 border-success/20";
      break;
    case "START":
      icon = "play_arrow";
      iconColor = "text-info";
      bgClass = "bg-info-container/10 border-info/20";
      break;
    case "SUBMIT":
      icon = "unarchive";
      iconColor = "text-warning";
      bgClass = "bg-warning-container/10 border-warning/20";
      break;
    case "APPROVE":
      icon = "verified";
      iconColor = "text-success";
      bgClass = "bg-success-container/10 border-success/20";
      break;
    case "PAID":
      icon = "payments";
      iconColor = "text-success";
      bgClass = "bg-success-container/10 border-success/20";
      break;
    case "DISPUTE":
      icon = "gavel";
      iconColor = "text-error";
      bgClass = "bg-error-container/10 border-error/20";
      break;
    case "KYC":
      icon = "badge";
      iconColor = "text-success";
      bgClass = "bg-success-container/10 border-success/20";
      break;
    case "STATUS":
      icon = "description";
      iconColor = "text-secondary";
      bgClass = "bg-secondary-container/10 border-secondary/20";
      break;
    default:
      icon = "info";
  }

  const dateString = new Date(event.created_at).toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div className="flex gap-4 items-start select-none">
      <div className="flex flex-col items-center shrink-0 h-full self-stretch">
        <div className={`w-8 h-8 rounded-full border ${bgClass} ${iconColor} flex items-center justify-center relative z-10 shadow-sm shrink-0`}>
          <span className="material-symbols-outlined text-[15px]">{icon}</span>
        </div>
        {!isLast && (
          <div className="w-[1.5px] bg-outline-variant/30 flex-1 my-1 min-h-[30px]" />
        )}
      </div>

      <div className="flex-1 flex flex-col gap-1 pb-6 min-w-0">
        <div className="flex flex-wrap justify-between items-baseline gap-2">
          <span className="text-xs font-bold text-on-surface truncate">
            {event.title}
          </span>
          <span className="text-[9px] text-muted-foreground font-semibold">{dateString}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-normal whitespace-pre-wrap">
          {event.description}
        </p>
      </div>
    </div>
  );
};
