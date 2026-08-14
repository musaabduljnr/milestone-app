import React from "react";
import { Badge } from "@/components/ui/Badge";

export type ProjectStatus = "in_progress" | "completed" | "in_review" | "draft" | "disputed";

export interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const statusConfig = {
    in_progress: { variant: "info", label: "In Progress" },
    completed: { variant: "success", label: "Completed" },
    in_review: { variant: "warning", label: "In Review" },
    draft: { variant: "neutral", label: "Draft" },
    disputed: { variant: "error", label: "Disputed" },
  } as const;

  const config = statusConfig[status] || { variant: "neutral", label: status };

  return (
    <Badge variant={config.variant} size="sm" className={className}>
      {config.label}
    </Badge>
  );
};
