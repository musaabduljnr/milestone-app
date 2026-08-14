import React from "react";
import { Card } from "@/components/ui/Card";

export interface ActivityItemData {
  id: string;
  iconName: string;
  message: React.ReactNode;
  timestamp: string;
  iconVariant?: "primary" | "secondary" | "neutral";
}

export interface ActivityTimelineProps {
  activities: ActivityItemData[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const getIconStyles = (variant: ActivityItemData["iconVariant"] = "neutral") => {
    switch (variant) {
      case "primary":
        return "bg-primary-container/20 text-primary";
      case "secondary":
        return "bg-secondary-container text-primary border border-secondary-fixed-dim";
      case "neutral":
        return "bg-surface-container-high text-secondary";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-surface-container-highest">
        <span className="material-symbols-outlined text-secondary select-none">history</span>
        <h3 className="font-label-caps text-caption text-secondary font-semibold uppercase tracking-wider">
          Project Activity
        </h3>
      </div>

      <div className="flex flex-col gap-5">
        {activities.map((act) => (
          <div key={act.id} className="flex items-start gap-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${getIconStyles(
                act.iconVariant
              )}`}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {act.iconName}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-body-sm text-body-sm text-on-surface">
                {act.message}
              </div>
              <span className="font-data-mono text-[10px] text-muted-foreground block mt-0.5">
                {act.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
