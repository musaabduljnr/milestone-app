"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";

interface DisputeStatusBadgeProps {
  status: string;
}

export const DisputeStatusBadge: React.FC<DisputeStatusBadgeProps> = ({ status }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case "OPEN":
        return {
          variant: "error" as const,
          label: "Dispute Open",
        };
      case "UNDER_REVIEW":
        return {
          variant: "info" as const,
          label: "Under Review",
        };
      case "AWAITING_RESPONSE":
        return {
          variant: "warning" as const,
          label: "Awaiting Response",
        };
      case "RESOLVED_CLIENT":
        return {
          variant: "success" as const,
          label: "Refunded to Client",
        };
      case "RESOLVED_FREELANCER":
        return {
          variant: "success" as const,
          label: "Released to Freelancer",
        };
      case "CLOSED":
        return {
          variant: "neutral" as const,
          label: "Settled & Closed",
        };
      default:
        return {
          variant: "neutral" as const,
          label: status,
        };
    }
  };

  const badgeStyle = getBadgeStyle();

  return (
    <Badge variant={badgeStyle.variant} className="text-[10px] select-none py-0.5 px-2.5 font-bold uppercase tracking-wider">
      {badgeStyle.label}
    </Badge>
  );
};
