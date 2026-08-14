import React from "react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { MilestoneStepData, FreelancerProfile } from "./MilestonesStep";

export interface AssignmentStepProps {
  milestones: MilestoneStepData[];
  onChange: (milestones: MilestoneStepData[]) => void;
  freelancers: FreelancerProfile[];
  onNext: () => void;
  onBack: () => void;
}

export const AssignmentStep: React.FC<AssignmentStepProps> = ({
  milestones,
  onChange,
  freelancers,
  onNext,
  onBack,
}) => {
  const handleAssigneeChange = (index: number, freelancerId: string) => {
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      assigned_freelancer_id: freelancerId || null,
    };
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          Assign Freelancers
        </h2>
        <p className="font-body-sm text-body-sm text-muted-foreground mt-1">
          Select developer assignees for each project milestone stage.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {milestones.map((m, index) => {
          const selectedFreelancer = freelancers.find((f) => f.id === m.assigned_freelancer_id);
          const initials = selectedFreelancer?.full_name
            ? selectedFreelancer.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
            : "";

          return (
            <div
              key={index}
              className="p-4 rounded-xl border border-outline-variant bg-surface flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <span className="font-label-caps text-[10px] text-primary font-bold uppercase tracking-wider block mb-1">
                  Milestone {index + 1}
                </span>
                <h4 className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                  {m.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Payout: ${m.payout_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 w-full sm:w-64">
                <Avatar
                  src={selectedFreelancer?.avatar_url || undefined}
                  initials={initials || "UN"}
                  size="sm"
                  className={selectedFreelancer ? "bg-primary-container/20 text-primary border-primary/20" : ""}
                />
                
                <div className="flex-1">
                  <Select
                    value={m.assigned_freelancer_id || ""}
                    onChange={(e) => handleAssigneeChange(index, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {freelancers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.full_name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between gap-3 pt-4 border-t border-outline-variant/30 mt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onNext}>
          Continue to Review
        </Button>
      </div>
    </div>
  );
};
