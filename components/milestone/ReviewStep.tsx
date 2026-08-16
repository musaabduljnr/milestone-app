import React from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProjectBasicsData } from "./ProjectBasicsStep";
import { ProjectBudgetData } from "./BudgetStep";
import { MilestoneStepData, FreelancerProfile } from "./MilestonesStep";

export interface ReviewStepProps {
  basics: ProjectBasicsData;
  budget: ProjectBudgetData;
  milestones: MilestoneStepData[];
  freelancers: FreelancerProfile[];
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  basics,
  budget,
  milestones,
  freelancers,
  onSubmit,
  onBack,
  isSubmitting = false,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          Review &amp; Create Project
        </h2>
        <p className="font-body-sm text-body-sm text-muted-foreground mt-1">
          Review details before creating your contract.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Project basics summary */}
        <Card className="p-6">
          <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider mb-4 border-b border-outline-variant/30 pb-2">
            Project Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-sans">
            <div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Project Title</span>
              <span className="font-semibold text-on-surface text-body-base block mt-0.5">{basics.title}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Category</span>
              <span className="font-semibold text-on-surface text-body-base block mt-0.5">{basics.category}</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Description</span>
              <p className="text-secondary mt-1 whitespace-pre-wrap leading-relaxed">{basics.description}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Budget size</span>
              <span className="font-data-mono text-body-base font-bold text-primary block mt-0.5">
                {budget.currency} {budget.budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Target Completion Date</span>
              <span className="font-semibold text-on-surface block mt-0.5">{basics.expectedCompletion}</span>
            </div>
          </div>
        </Card>

        {/* Milestones list summary */}
        <div className="flex flex-col gap-3">
          <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider px-2">
            Milestone Schedule ({milestones.length} stages)
          </h3>
          
          {milestones.map((m, index) => {
            const assigneeFromList = freelancers.find((f) => f.id === m.assigned_freelancer_id);
            const assigneeName = m.assigned_freelancer_name || assigneeFromList?.full_name || null;
            const assigneeEmail = m.assigned_freelancer_email || assigneeFromList?.email || null;
            const hasAssignee = Boolean(assigneeName || assigneeEmail || m.assigned_freelancer_id);

            return (
              <div
                key={index}
                className="p-4 rounded-xl border border-outline-variant bg-surface flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-body-base text-body-sm font-semibold text-on-surface truncate">
                      Phase {index + 1}: {m.title}
                    </h4>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {m.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                      Deadline: {m.deadline}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">person</span>
                      Assignee:{" "}
                      {hasAssignee ? (
                        <span className="text-primary font-semibold">
                          {assigneeName || assigneeEmail} (Pending Invitation)
                        </span>
                      ) : (
                        <span className="text-secondary font-medium">Unassigned</span>
                      )}
                    </span>
                  </div>
                </div>

                <span className="font-data-mono text-body-sm font-semibold text-on-surface shrink-0">
                  {budget.currency} {m.payout_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-between gap-3 pt-4 border-t border-outline-variant/30 mt-4">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="px-6"
        >
          {isSubmitting ? "Creating Project..." : "Create Project"}
        </Button>
      </div>
    </div>
  );
};
