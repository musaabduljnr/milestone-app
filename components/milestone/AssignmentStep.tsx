"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { MilestoneStepData, FreelancerProfile } from "./MilestonesStep";
import { lookupFreelancerByEmailAction } from "@/app/projects/actions";

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
  // Map index -> email input value
  const [emailInputs, setEmailInputs] = React.useState<Record<number, string>>({});
  // Map index -> boolean loading state
  const [verifyingIndex, setVerifyingIndex] = React.useState<number | null>(null);
  // Map index -> error string
  const [errors, setErrors] = React.useState<Record<number, string | null>>({});
  // Quick picker visibility per index
  const [showQuickPicker, setShowQuickPicker] = React.useState<Record<number, boolean>>({});

  const handleEmailInputChange = (index: number, val: string) => {
    setEmailInputs((prev) => ({ ...prev, [index]: val }));
    if (errors[index]) {
      setErrors((prev) => ({ ...prev, [index]: null }));
    }
  };

  const handleVerifyAndAssign = async (index: number, emailToVerify?: string) => {
    const rawEmail = emailToVerify !== undefined ? emailToVerify : (emailInputs[index] || "");
    const email = rawEmail.trim().toLowerCase();

    if (!email) {
      setErrors((prev) => ({ ...prev, [index]: "Please enter a freelancer email address." }));
      return;
    }

    setVerifyingIndex(index);
    setErrors((prev) => ({ ...prev, [index]: null }));

    try {
      const res = await lookupFreelancerByEmailAction(email);

      if (!res.success) {
        setErrors((prev) => ({ ...prev, [index]: res.error || "Failed to look up email." }));
        return;
      }

      if (!res.data || !res.data.exists) {
        setErrors((prev) => ({
          ...prev,
          [index]: "No Milestone freelancer account was found for this email.",
        }));
        return;
      }

      // Successful lookup
      const freelancer = res.data;
      const updated = [...milestones];
      updated[index] = {
        ...updated[index],
        assigned_freelancer_id: freelancer.id || null,
        assigned_freelancer_email: freelancer.email || email,
        assigned_freelancer_name: freelancer.full_name || "Freelancer",
        assigned_freelancer_avatar: freelancer.avatar_url || null,
      };
      onChange(updated);

      // Clear input and picker
      setEmailInputs((prev) => ({ ...prev, [index]: "" }));
      setShowQuickPicker((prev) => ({ ...prev, [index]: false }));
      setErrors((prev) => ({ ...prev, [index]: null }));
    } catch (err) {
      console.error("Assignment verification error:", err);
      setErrors((prev) => ({
        ...prev,
        [index]: "A network error occurred while verifying the email.",
      }));
    } finally {
      setVerifyingIndex(null);
    }
  };

  const handleSelectFromList = (index: number, f: FreelancerProfile) => {
    if (f.email) {
      handleVerifyAndAssign(index, f.email);
    } else {
      const updated = [...milestones];
      updated[index] = {
        ...updated[index],
        assigned_freelancer_id: f.id,
        assigned_freelancer_name: f.full_name,
        assigned_freelancer_avatar: f.avatar_url || null,
      };
      onChange(updated);
      setShowQuickPicker((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleRemoveAssignee = (index: number) => {
    const updated = [...milestones];
    updated[index] = {
      ...updated[index],
      assigned_freelancer_id: null,
      assigned_freelancer_email: null,
      assigned_freelancer_name: null,
      assigned_freelancer_avatar: null,
    };
    onChange(updated);
    setErrors((prev) => ({ ...prev, [index]: null }));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Bento microcopy */}
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          Assign Freelancers
        </h2>
        <p className="font-body-sm text-body-sm text-muted-foreground mt-1 leading-relaxed">
          Invite freelancers by email for each milestone. They will receive an in-app notification and must explicitly accept before gaining access to the project workspace.
        </p>
      </div>

      {/* Info notice banner */}
      <div className="p-3.5 rounded-xl bg-primary-container/10 border border-primary/20 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">
          mark_email_unread
        </span>
        <div className="flex flex-col text-xs leading-relaxed">
          <span className="font-bold text-on-surface">Invitations &amp; Multi-Freelancer Scoping</span>
          <span className="text-secondary mt-0.5">
            Different freelancers can be assigned to different milestones. Invitations are pending until the freelancer reviews and accepts.
          </span>
        </div>
      </div>

      {/* Milestones Assignment Cards */}
      <div className="flex flex-col gap-4">
        {milestones.map((m, index) => {
          const isAssigned = Boolean(m.assigned_freelancer_email || m.assigned_freelancer_id || m.assigned_freelancer_name);
          const assigneeName = m.assigned_freelancer_name || "Freelancer";
          const assigneeEmail = m.assigned_freelancer_email || "";
          const initials = assigneeName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);

          const isVerifying = verifyingIndex === index;
          const errorMessage = errors[index];
          const isQuickOpen = showQuickPicker[index];

          return (
            <div
              key={index}
              className="p-5 rounded-xl border border-outline-variant bg-surface flex flex-col gap-4 transition-all"
            >
              {/* Milestone Details Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline-variant/30 pb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-label-caps text-[10px] text-primary font-bold uppercase tracking-wider">
                      Milestone {index + 1}
                    </span>
                    {isAssigned ? (
                      <Badge variant="info" className="text-[10px] py-0 px-2">
                        Pending Invitation
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[10px] py-0 px-2">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-body-sm text-body-sm font-semibold text-on-surface truncate mt-0.5">
                    {m.title}
                  </h4>
                  {m.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {m.description}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-data-mono text-body-sm font-bold text-on-surface">
                    ${m.payout_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Assignment Action Area */}
              {isAssigned ? (
                /* Assigned State Display */
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 rounded-lg bg-surface-container border border-outline-variant/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={m.assigned_freelancer_avatar || undefined}
                      initials={initials || "FL"}
                      size="sm"
                      className="bg-primary/10 text-primary border-primary/20 shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-on-surface truncate">
                          {assigneeName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          (Pending invitation)
                        </span>
                      </div>
                      {assigneeEmail && (
                        <span className="text-[11px] text-muted-foreground font-mono truncate">
                          {assigneeEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(index)}
                      className="text-xs font-semibold text-error hover:text-error/80 px-2.5 py-1 rounded hover:bg-error-container/10 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                /* Unassigned State: Email Input & Invite */
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Input
                        type="email"
                        placeholder="Enter freelancer email (e.g. ahmed@milestone.app)"
                        value={emailInputs[index] || ""}
                        onChange={(e) => handleEmailInputChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleVerifyAndAssign(index);
                          }
                        }}
                        disabled={isVerifying}
                        className="h-10 text-xs"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleVerifyAndAssign(index)}
                      disabled={isVerifying || !(emailInputs[index] || "").trim()}
                      className="h-10 px-4 shrink-0 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isVerifying ? (
                        <>
                          <Spinner size="sm" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          <span>Invite</span>
                        </>
                      )}
                    </Button>

                    {freelancers.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowQuickPicker((prev) => ({ ...prev, [index]: !prev[index] }))
                        }
                        className="h-10 px-3 text-xs shrink-0 text-secondary border border-outline-variant/60 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px] mr-1">group</span>
                        <span>Pick</span>
                      </Button>
                    )}
                  </div>

                  {/* Quick registered freelancer picker dropdown */}
                  {isQuickOpen && freelancers.length > 0 && (
                    <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/50 flex flex-col gap-2 animate-fade-in">
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                        Quick Select Registered Freelancer
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {freelancers.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleSelectFromList(index, f)}
                            className="flex items-center gap-2.5 p-2 rounded-md hover:bg-surface-container-high text-left transition-colors border border-outline-variant/30 cursor-pointer"
                          >
                            <Avatar
                              src={f.avatar_url || undefined}
                              initials={f.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                              size="sm"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-on-surface truncate">
                                {f.full_name}
                              </span>
                              {f.email && (
                                <span className="text-[10px] text-muted-foreground truncate font-mono">
                                  {f.email}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Error alert */}
                  {errorMessage && (
                    <div className="p-2.5 rounded-lg bg-error-container/20 border border-error/20 text-error-container text-xs flex items-start gap-2 animate-fade-in">
                      <span className="material-symbols-outlined text-error text-[16px] mt-0.5 shrink-0">
                        error
                      </span>
                      <span className="leading-tight">{errorMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="flex justify-between gap-3 pt-4 border-t border-outline-variant/30 mt-2">
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
