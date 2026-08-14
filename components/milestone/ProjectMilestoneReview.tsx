"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner } from "@/components/ui/Spinner";
import { CountdownTimer } from "@/components/milestone/CountdownTimer";
import { approveMilestoneAction, openDisputeAction } from "@/app/projects/actions";
import { MilestoneDiscussion } from "@/components/milestone/MilestoneDiscussion";

export interface ProjectMilestoneReviewProps {
  milestoneId: string;
  projectId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "PAID" | "DISPUTED" | "AUTO_RELEASED";
  title: string;
  payoutAmount: number;
  currency: string;
  submittedAt: string | null;
  submissionDescription: string | null;
  isOwner: boolean; // Project Client Owner
  isAssignedFreelancer: boolean; // Assigned Freelancer
  dispute: {
    id: string;
    reason: string;
    description: string | null;
    status: "OPEN" | "RESOLVED";
  } | null;
}

export const ProjectMilestoneReview: React.FC<ProjectMilestoneReviewProps> = ({
  milestoneId,
  projectId,
  status,
  title,
  payoutAmount,
  currency,
  submittedAt,
  submissionDescription,
  isOwner,
  isAssignedFreelancer,
  dispute,
}) => {
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [showDisputeModal, setShowDisputeModal] = React.useState(false);
  const [disputeReason, setDisputeReason] = React.useState("");
  const [disputeDetail, setDisputeDetail] = React.useState("");

  const handleApprove = () => {
    if (isPending) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await approveMilestoneAction(milestoneId);
        if (!res.success) {
          setErrorMsg(res.error || "Failed to approve milestone.");
        }
      } catch {
        setErrorMsg("An unexpected error occurred during approval.");
      }
    });
  };

  const handleOpenDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    if (!disputeReason.trim()) {
      setErrorMsg("Please state your reason for opening a dispute.");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await openDisputeAction(milestoneId, disputeReason, disputeDetail);
        if (res.success) {
          setShowDisputeModal(false);
          setDisputeReason("");
          setDisputeDetail("");
        } else {
          setErrorMsg(res.error || "Failed to open dispute.");
        }
      } catch {
        setErrorMsg("An unexpected error occurred while filing the dispute.");
      }
    });
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {errorMsg && (
        <div className="p-3 rounded-lg bg-error-container/20 border border-error/15 text-error text-[11px] font-semibold leading-normal flex items-start gap-2">
          <span className="material-symbols-outlined text-error text-[14px] mt-0.5 select-none">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Workspace Links for Freelancer */}
      {isAssignedFreelancer && (status === "NOT_STARTED" || status === "IN_PROGRESS") && (
        <div className="flex justify-end">
          <Link href={`/freelancer/milestones/${milestoneId}`}>
            <Button variant="primary" size="sm" className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">terminal</span>
              <span>Go to Workspace</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Submitted review panel */}
      {status === "SUBMITTED" && (
        <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low/40 flex flex-col gap-3.5 mt-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
              Deliverables Submission
            </span>
            <p className="text-xs text-on-surface leading-relaxed italic whitespace-pre-wrap">
              &ldquo;{submissionDescription || "No notes provided."}&rdquo;
            </p>
            {submittedAt && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Submitted on: {new Date(submittedAt).toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/30 pt-3">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Review Clock
                </span>
                {submittedAt && <CountdownTimer submittedAt={submittedAt} />}
              </div>
              <div className="w-[1px] h-8 bg-outline-variant/30" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Payout Amount
                </span>
                <span className="font-data-mono text-xs font-bold text-primary">
                  {currency} {payoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {isOwner && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowDisputeModal(true)}
                  disabled={isPending}
                  className="text-error hover:bg-error/5 text-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">gavel</span>
                  <span>Dispute</span>
                </Button>

                <Button
                  variant="primary"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="text-xs flex items-center gap-1.5 min-w-32"
                >
                  {isPending ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      <span>Approve &amp; Release</span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {isAssignedFreelancer && (
              <Link href={`/freelancer/milestones/${milestoneId}`}>
                <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px]">terminal</span>
                  <span>View in Workspace</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Disputed state panel */}
      {status === "DISPUTED" && (
        <div className="p-4 rounded-xl border border-error/15 bg-error-container/5 flex flex-col gap-2 mt-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-error">
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              <span className="font-headline-sm text-xs font-bold text-on-surface">
                Dispute Open &bull; Payment Frozen
              </span>
            </div>
            <Badge variant="error">Auto-release Paused</Badge>
          </div>

          {dispute && (
            <div className="mt-1 flex flex-col gap-0.5 text-xs leading-normal">
              <p className="text-secondary font-semibold">
                Reason: &ldquo;{dispute.reason}&rdquo;
              </p>
              {dispute.description && (
                <p className="text-muted-foreground">
                  Details: {dispute.description}
                </p>
              )}
            </div>
          )}

          {isAssignedFreelancer && (
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-outline-variant/20">
              {dispute?.id && (
                <Link href={`/projects/${projectId}/disputes/${dispute.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 border border-outline-variant text-error hover:bg-error-container/10">
                    <span className="material-symbols-outlined text-[14px]">gavel</span>
                    <span>View Dispute Resolution</span>
                  </Button>
                </Link>
              )}
              <Link href={`/freelancer/milestones/${milestoneId}`}>
                <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px]">terminal</span>
                  <span>Go to Workspace</span>
                </Button>
              </Link>
            </div>
          )}

          {!isAssignedFreelancer && dispute?.id && (
            <div className="flex justify-end mt-2 pt-2 border-t border-outline-variant/20">
              <Link href={`/projects/${projectId}/disputes/${dispute.id}`}>
                <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 border border-outline-variant text-error hover:bg-error-container/10">
                  <span className="material-symbols-outlined text-[14px]">gavel</span>
                  <span>View Dispute Resolution</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 flex flex-col gap-4 shadow-xl border-outline-variant animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-error pb-1 border-b border-outline-variant/30">
              <span className="material-symbols-outlined text-[20px] select-none">gavel</span>
              <h3 className="font-headline-sm text-body-base font-bold text-on-surface">
                File Escrow Dispute
              </h3>
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              Opening a dispute pauses the normal milestone resolution flow while both sides review the issue.
            </p>

            <form onSubmit={handleOpenDispute} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-secondary">
                  Dispute Reason
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="text-xs rounded-lg border border-outline bg-surface p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="Deliverables do not match the agreed scope">Deliverables do not match the agreed scope</option>
                  <option value="Work is incomplete">Work is incomplete</option>
                  <option value="Client has not provided required information">Client has not provided required information</option>
                  <option value="Payment issue">Payment issue</option>
                  <option value="Deadline issue">Deadline issue</option>
                  <option value="Quality concerns">Quality concerns</option>
                  <option value="Scope disagreement">Scope disagreement</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-secondary">
                  Detailed Explanation (Optional)
                </label>
                <Textarea
                  placeholder="Provide context regarding expectations and deliverables mismatch..."
                  value={disputeDetail}
                  onChange={(e) => setDisputeDetail(e.target.value)}
                  rows={4}
                  className="font-sans text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-outline-variant/30">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDisputeModal(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-error hover:bg-error-container text-white border-none"
                  disabled={isPending}
                >
                  {isPending ? <Spinner size="sm" /> : "Open Dispute & Freeze"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Milestone Discussion Context */}
      <MilestoneDiscussion
        projectId={projectId}
        milestoneId={milestoneId}
        milestoneTitle={title}
        milestoneStatus={status}
        activeRole={isOwner ? "client" : "freelancer"}
      />
    </div>
  );
};
