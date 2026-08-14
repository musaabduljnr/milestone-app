import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface AIAssistantCardProps {
  type: "creep_alert" | "milestone_suggest" | "scope_verification";
  onAction?: () => void;
  actionLabel?: string;
}

export const AIAssistantCard: React.FC<AIAssistantCardProps> = ({
  type,
  onAction,
  actionLabel = "Review Details",
}) => {
  if (type === "creep_alert") {
    return (
      <Card className="p-6 relative overflow-hidden group hover:border-outline transition-colors">
        {/* Glowing blur overlay */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-9 h-9 rounded-md bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px] select-none">psychology</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-body-base text-body-base font-bold text-on-surface">
              AI Scope creeping Alert
            </h4>
            <p className="font-body-sm text-xs text-secondary mt-1 mb-4">
              Scope creep detected on &ldquo;Mobile App Redesign&rdquo;. Milestone 2 exceeds initial contract requirements by 15%.
            </p>
            {onAction && (
              <button
                onClick={onAction}
                className="text-primary font-body-sm text-xs font-semibold inline-flex items-center gap-1 hover:underline text-left"
              >
                {actionLabel}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (type === "milestone_suggest") {
    return (
      <Card className="p-6 relative overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl">
        <div className="absolute inset-0 bg-primary-container/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-[20px] select-none">auto_awesome</span>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              AI Suggested Milestones
            </h3>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="bg-surface border border-outline-variant rounded p-3.5 flex flex-col gap-1 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l" />
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-body-sm text-body-sm font-semibold text-on-surface">
                  Phase 1: Design &amp; Wireframing
                </h4>
                <span className="font-data-mono text-xs text-on-surface-variant font-semibold shrink-0">
                  $1,200
                </span>
              </div>
              <p className="font-body-sm text-xs text-muted-foreground">
                Wireframes and design approvals.
              </p>
            </div>
            
            <div className="bg-surface border border-outline-variant rounded p-3.5 flex flex-col gap-1 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l" />
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-body-sm text-body-sm font-semibold text-on-surface">
                  Phase 2: Core Development
                </h4>
                <span className="font-data-mono text-xs text-on-surface-variant font-semibold shrink-0">
                  $2,500
                </span>
              </div>
              <p className="font-body-sm text-xs text-muted-foreground">
                Implementation of main dashboard features.
              </p>
            </div>
          </div>

          {onAction && (
            <Button
              variant="ai"
              onClick={onAction}
              className="w-full font-label-caps text-xs py-2 bg-primary text-white"
            >
              Apply AI Suggestions
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Scope Verification
  return (
    <Card className="p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary-container/10 border border-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px] select-none">fact_check</span>
          </div>
          <div>
            <h3 className="font-headline-sm text-body-base font-bold text-on-surface leading-tight">
              AI Scope Verification
            </h3>
            <p className="font-body-sm text-xs text-muted-foreground">
              Reviewing submission deliverables
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="font-headline-sm text-success text-body-base font-bold">85% Match</span>
          <span className="text-[10px] text-muted-foreground">Confidence Score</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Matched */}
        <div className="space-y-2">
          <h4 className="font-label-caps text-[10px] text-success font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Matched Items
          </h4>
          <ul className="space-y-1.5 font-body-sm text-xs text-muted-foreground">
            <li className="flex items-start gap-1.5 p-2 rounded bg-surface border border-outline-variant/30">
              <span className="material-symbols-outlined text-success text-[16px] mt-0.5">check</span>
              Implement OAuth 2.0 Google login
            </li>
            <li className="flex items-start gap-1.5 p-2 rounded bg-surface border border-outline-variant/30">
              <span className="material-symbols-outlined text-success text-[16px] mt-0.5">check</span>
              Create responsive dashboard layout
            </li>
          </ul>
        </div>

        {/* Warning */}
        <div className="space-y-2">
          <h4 className="font-label-caps text-[10px] text-error font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Requires Review
          </h4>
          <ul className="space-y-1.5 font-body-sm text-xs text-muted-foreground">
            <li className="flex items-start gap-1.5 p-2 rounded bg-error-container/20 border border-error/15 text-error-container">
              <span className="material-symbols-outlined text-error text-[16px] mt-0.5">priority_high</span>
              <div>
                <span className="font-semibold block mb-0.5">Missing: Export to CSV</span>
                <span className="text-[10px] text-muted-foreground">Build does not appear to contain export.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {onAction && (
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-outline-variant">
          <button className="px-4 py-2 rounded font-label-caps text-xs text-secondary border border-outline-variant hover:bg-surface-container-low transition-colors">
            Request Revisions
          </button>
          <Button variant="primary" size="sm" onClick={onAction}>
            Approve Work
          </Button>
        </div>
      )}
    </Card>
  );
};
