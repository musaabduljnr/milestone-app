import React from "react";
import { Badge } from "@/components/ui/Badge";

export interface MilestoneStep {
  id: string;
  title: string;
  amount: number;
  status: "paid" | "submitted" | "in_progress" | "not_started";
}

export interface MilestoneStepperProps {
  steps: MilestoneStep[];
}

export const MilestoneStepper: React.FC<MilestoneStepperProps> = ({ steps }) => {
  const getIcon = (status: MilestoneStep["status"]) => {
    switch (status) {
      case "paid":
        return <span className="material-symbols-outlined text-[1.25rem]">check</span>;
      case "submitted":
        return <span className="material-symbols-outlined text-[1.25rem]">rate_review</span>;
      case "in_progress":
        return <span className="material-symbols-outlined text-[1.25rem]">more_horiz</span>;
      case "not_started":
        return <span className="material-symbols-outlined text-[1.25rem]">lock</span>;
    }
  };

  const getIconStyles = (status: MilestoneStep["status"]) => {
    switch (status) {
      case "paid":
        return "bg-success-container text-success border-success-container";
      case "submitted":
        return "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary ring-offset-2";
      case "in_progress":
        return "bg-surface-container-highest text-secondary border-outline-variant";
      case "not_started":
        return "bg-surface text-outline-variant border-outline-variant border-dashed";
    }
  };

  const getBadge = (status: MilestoneStep["status"]) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Paid</Badge>;
      case "submitted":
        return <Badge variant="error">Submitted</Badge>;
      case "in_progress":
        return <Badge variant="info">In Progress</Badge>;
      case "not_started":
        return <Badge variant="neutral">Not Started</Badge>;
    }
  };

  return (
    <div className="w-full">
      {/* Desktop Version */}
      <div className="hidden md:block relative w-full pb-6">
        {/* Connecting timeline line */}
        <div className="absolute top-[1.5rem] left-0 w-full h-[2px] bg-surface-container-highest z-0" />
        
        <div className="flex justify-between items-start relative z-10">
          {steps.map((step) => (
            <div key={step.id} className="flex-1 flex flex-col items-center text-center px-2">
              <div
                className={`w-12 h-12 rounded-full border-2 bg-surface flex items-center justify-center shrink-0 mb-3 transition-all ${getIconStyles(
                  step.status
                )}`}
              >
                {getIcon(step.status)}
              </div>
              <h4 className="font-body-sm text-body-sm font-semibold text-on-surface line-clamp-1">
                {step.title}
              </h4>
              <p className="font-data-mono text-xs text-muted-foreground mt-0.5">
                ${step.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2">{getBadge(step.status)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Version (Vertical List) */}
      <div className="md:hidden flex flex-col gap-6 pl-4 relative">
        {/* Vertical line */}
        <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-surface-container-highest z-0" />

        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-4 relative z-10">
            <div
              className={`w-12 h-12 rounded-full border-2 bg-surface flex items-center justify-center shrink-0 transition-all ${getIconStyles(
                step.status
              )}`}
            >
              {getIcon(step.status)}
            </div>
            
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-body-base text-body-base font-semibold text-on-surface">
                  {step.title}
                </h4>
                <span className="font-data-mono text-body-sm text-on-surface font-medium shrink-0">
                  ${step.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {getBadge(step.status)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
