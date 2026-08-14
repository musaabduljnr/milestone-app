"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Textarea } from "@/components/ui/Textarea";
import {
  proposeDisputeResolutionAction,
  acceptDisputeProposalAction,
  rejectDisputeProposalAction,
  concedeDisputeAction,
} from "@/app/disputes/actions";

interface DisputeResolutionPanelProps {
  disputeId: string;
  payoutAmount: number;
  currency: string;
  status: string;
  currentUserRole: "client" | "freelancer";
  proposalBy: string | null;
  proposalClientAmount: number | null;
  proposalFreelancerAmount: number | null;
  proposalNote: string | null;
  currentUserId: string;
}

export const DisputeResolutionPanel: React.FC<DisputeResolutionPanelProps> = ({
  disputeId,
  payoutAmount,
  currency,
  status,
  currentUserRole,
  proposalBy,
  proposalClientAmount,
  proposalFreelancerAmount,
  proposalNote,
  currentUserId,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [showProposeForm, setShowProposeForm] = React.useState(false);
  const [freelancerSplit, setFreelancerSplit] = React.useState<number>(payoutAmount);
  const [clientSplit, setClientSplit] = React.useState<number>(0);
  const [proposalReason, setProposalReason] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Sync splits whenever freelancerSplit changes
  const handleFreelancerChange = (val: number) => {
    setFreelancerSplit(val);
    const clientPart = Math.max(0, payoutAmount - val);
    setClientSplit(Number(clientPart.toFixed(2)));
  };

  // Sync splits when clientSplit changes
  const handleClientChange = (val: number) => {
    setClientSplit(val);
    const freelancerPart = Math.max(0, payoutAmount - val);
    setFreelancerSplit(Number(freelancerPart.toFixed(2)));
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const total = freelancerSplit + clientSplit;
    if (Math.abs(total - payoutAmount) > 0.01) {
      setErrorMsg(`Splits sum must equal ${currency} ${payoutAmount.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await proposeDisputeResolutionAction(
        disputeId,
        clientSplit,
        freelancerSplit,
        proposalReason
      );

      if (res.success) {
        setSuccessMsg("Resolution proposal submitted successfully.");
        setShowProposeForm(false);
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Failed to propose resolution.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await acceptDisputeProposalAction(disputeId);
      if (res.success) {
        setSuccessMsg("Proposal accepted. Dispute resolved.");
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Failed to accept proposal.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await rejectDisputeProposalAction(disputeId);
      if (res.success) {
        setSuccessMsg("Proposal declined.");
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Failed to decline proposal.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleConcede = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const targetConcede = currentUserRole === "client" ? "freelancer" : "client";
    const confirmMsg =
      currentUserRole === "client"
        ? "Conceding will immediately release the full escrow payout to the freelancer. This cannot be undone. Proceed?"
        : "Conceding will immediately refund the full escrow payout back to the client. This cannot be undone. Proceed?";

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await concedeDisputeAction(disputeId, targetConcede);
      if (res.success) {
        setSuccessMsg("Dispute successfully conceded and resolved.");
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Concession failed.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const isResolved = ["RESOLVED_CLIENT", "RESOLVED_FREELANCER", "CLOSED"].includes(status);
  const isAwaitingResponse = status === "AWAITING_RESPONSE";
  const myProposal = proposalBy === currentUserId;

  return (
    <Card className="p-5 border border-outline-variant/30 flex flex-col gap-4">
      <div>
        <h4 className="font-headline-sm text-body-base font-bold text-on-surface">
          Resolution Centre
        </h4>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
          Peer-to-peer settlement portal. Funds split proposals require mutual approval.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-error-container/10 border border-error/15 text-error text-xs">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-success-container/10 border border-success/15 text-success text-xs">
          {successMsg}
        </div>
      )}

      {/* 1. Resolved State Display */}
      {isResolved && (
        <div className="p-4 rounded-xl border border-success/15 bg-success-container/5 text-success text-xs flex flex-col gap-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Dispute Settled</span>
          </div>
          {status === "RESOLVED_CLIENT" && (
            <p className="text-muted-foreground text-[11px]">
              This dispute was resolved in favor of the Client. Payout funds were fully refunded.
            </p>
          )}
          {status === "RESOLVED_FREELANCER" && (
            <p className="text-muted-foreground text-[11px]">
              This dispute was resolved in favor of the Freelancer. Escrow funds were fully released.
            </p>
          )}
          {status === "CLOSED" && (
            <p className="text-muted-foreground text-[11px]">
              This dispute has been settled and closed via mutual split agreement.
            </p>
          )}
        </div>
      )}

      {/* 2. Proposal Awaiting Action */}
      {!isResolved && isAwaitingResponse && (
        <div className="flex flex-col gap-3">
          <div className="p-4 rounded-xl border border-warning/15 bg-warning-container/5 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-warning select-none">
              <span className="material-symbols-outlined text-[16px]">pending</span>
              <span>Pending Proposal Split</span>
            </div>

            <div className="flex flex-col gap-1.5 text-on-surface">
              <div className="flex justify-between border-b border-outline-variant/20 pb-1.5 text-[11px]">
                <span className="text-muted-foreground font-medium">Freelancer Share</span>
                <span className="font-bold">{currency} {proposalFreelancerAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pb-0.5 text-[11px]">
                <span className="text-muted-foreground font-medium">Client Share</span>
                <span className="font-bold">{currency} {proposalClientAmount?.toFixed(2)}</span>
              </div>
            </div>

            {proposalNote && (
              <p className="text-[11px] text-muted-foreground bg-surface-container p-2 rounded-lg leading-relaxed mt-1">
                &ldquo;{proposalNote}&rdquo;
              </p>
            )}
          </div>

          {myProposal ? (
            <p className="text-[11.5px] text-center text-muted-foreground py-2 leading-normal">
              Waiting for the other party to review your settlement proposal.
            </p>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleDecline}
                variant="ghost"
                className="flex-1 text-xs border border-outline hover:bg-surface-container-high cursor-pointer"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : "Decline"}
              </Button>
              <Button
                onClick={handleAccept}
                variant="primary"
                className="flex-1 text-xs bg-primary text-white border-none cursor-pointer"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : "Accept Split"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 3. Open State Actions */}
      {!isResolved && !isAwaitingResponse && (
        <div className="flex flex-col gap-2.5">
          {!showProposeForm ? (
            <>
              <Button
                onClick={() => setShowProposeForm(true)}
                variant="primary"
                className="w-full text-xs font-semibold select-none cursor-pointer"
                disabled={loading}
              >
                Propose Settlement Split
              </Button>

              <Button
                onClick={handleConcede}
                variant="ghost"
                className="w-full text-xs text-error border border-error/20 hover:bg-error-container/5 font-semibold select-none cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : currentUserRole === "client" ? (
                  "Concede to Freelancer"
                ) : (
                  "Concede to Client"
                )}
              </Button>
            </>
          ) : (
            <form onSubmit={handlePropose} className="flex flex-col gap-3.5 border-t border-outline-variant/20 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface">Split Resolution Proposal</span>
                <button
                  type="button"
                  onClick={() => setShowProposeForm(false)}
                  className="text-xs text-muted-foreground hover:text-primary font-medium"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-secondary">
                    Freelancer Share ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={payoutAmount}
                    value={freelancerSplit}
                    onChange={(e) => handleFreelancerChange(Number(e.target.value))}
                    className="text-xs border border-outline bg-surface p-2 rounded-lg font-data-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-secondary">
                    Client Share ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={payoutAmount}
                    value={clientSplit}
                    onChange={(e) => handleClientChange(Number(e.target.value))}
                    className="text-xs border border-outline bg-surface p-2 rounded-lg font-data-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-secondary">
                  Proposal Reason / Notes
                </label>
                <Textarea
                  placeholder="Explain why this split is fair for both parties..."
                  value={proposalReason}
                  onChange={(e) => setProposalReason(e.target.value)}
                  className="text-xs"
                  rows={3}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs cursor-pointer"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : "Send Proposal"}
              </Button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
};
