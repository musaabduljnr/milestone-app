"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { resolveDisputeAction } from "@/app/admin/actions";

interface DisputeData {
  id: string;
  reason: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
  resolution_note: string | null;
  project: {
    id: string;
    title: string;
    client: {
      full_name: string;
      email: string;
    } | null;
  } | null;
  milestone: {
    id: string;
    title: string;
    payout_amount: number;
    freelancer: {
      full_name: string;
      email: string;
    } | null;
  } | null;
}

interface DisputesClientProps {
  disputes: DisputeData[];
}

export default function DisputesClient({ disputes: initialDisputes }: DisputesClientProps) {
  const [disputes, setDisputes] = React.useState<DisputeData[]>(initialDisputes);
  const [selectedDispute, setSelectedDispute] = React.useState<DisputeData | null>(null);
  const [outcome, setOutcome] = React.useState<"CLIENT_FAVORED" | "FREELANCER_FAVORED" | "PARTIAL_RESOLUTION">("CLIENT_FAVORED");
  const [resolutionNote, setResolutionNote] = React.useState("");
  const [clientAmount, setClientAmount] = React.useState(0);
  const [freelancerAmount, setFreelancerAmount] = React.useState(0);
  const [isResolving, setIsResolving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const handleOpenArbitration = (dispute: DisputeData) => {
    const payout = Number(dispute.milestone?.payout_amount || 0);
    setSelectedDispute(dispute);
    setOutcome("CLIENT_FAVORED");
    setClientAmount(payout);
    setFreelancerAmount(0);
    setResolutionNote("");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    const payout = Number(selectedDispute.milestone?.payout_amount || 0);
    const sum = Number(clientAmount) + Number(freelancerAmount);

    if (Math.abs(sum - payout) > 0.01) {
      setErrorMsg(`The sum of split amounts ($${sum}) must equal the total milestone payout ($${payout}).`);
      return;
    }

    if (!resolutionNote.trim()) {
      setErrorMsg("Please provide a brief justification/note for the dispute resolution.");
      return;
    }

    setIsResolving(true);
    setErrorMsg(null);

    try {
      const res = await resolveDisputeAction(
        selectedDispute.id,
        outcome,
        resolutionNote,
        Number(clientAmount),
        Number(freelancerAmount)
      );

      if (res.success) {
        setSuccessMsg("Dispute successfully arbitrated and escrow ledger settled!");
        // Update local status
        setDisputes((prev) =>
          prev.map((d) =>
            d.id === selectedDispute.id
              ? {
                  ...d,
                  status: outcome === "CLIENT_FAVORED" ? "RESOLVED_CLIENT" : outcome === "FREELANCER_FAVORED" ? "RESOLVED_FREELANCER" : "CLOSED",
                  resolution: outcome,
                  resolution_note: resolutionNote,
                }
              : d
          )
        );
        setTimeout(() => setSelectedDispute(null), 2000);
      } else {
        setErrorMsg(res.error || "Failed to resolve dispute. Please check logs.");
      }
    } catch {
      setErrorMsg("An unexpected client error occurred.");
    } finally {
      setIsResolving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Dispute list queue */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {disputes.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-xs">
            No payment disputes have been filed on the platform.
          </Card>
        ) : (
          disputes.map((dispute) => {
            const isResolved = dispute.status !== "OPEN";

            return (
              <Card key={dispute.id} className={`p-6 flex flex-col gap-4 border-l-4 ${isResolved ? "border-l-secondary/40 bg-surface/50" : "border-l-error"}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-on-surface text-xs md:text-sm">
                      Dispute for {dispute.milestone?.title || "Untitled Milestone"}
                    </h3>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Project: <span className="font-semibold text-secondary">{dispute.project?.title || "N/A"}</span>
                    </span>
                  </div>

                  <Badge variant={isResolved ? "neutral" : "error"} className="text-[9px] font-bold py-0.5 px-2 uppercase">
                    {dispute.status.replace("RESOLVED_", "")}
                  </Badge>
                </div>

                <div className="p-3 bg-surface-container rounded-lg text-xs leading-relaxed text-secondary border border-outline-variant/30">
                  <span className="font-bold text-[9px] text-muted-foreground uppercase block mb-1">Reason for Dispute</span>
                  {dispute.reason || "No reason submitted."}
                </div>

                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span>Filed: {formatDate(dispute.created_at)}</span>
                  <span>Amount: <span className="font-semibold text-on-surface">{formatCurrency(dispute.milestone?.payout_amount || 0)}</span></span>
                </div>

                {!isResolved && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="primary"
                      className="text-[10px] h-8 px-4"
                      onClick={() => handleOpenArbitration(dispute)}
                    >
                      Arbitrate Escrow
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Arbitration Controls Section */}
      <div className="lg:col-span-1">
        {selectedDispute ? (
          <Card className="p-6 flex flex-col gap-6 sticky top-6 shadow-modal border-t-4 border-t-error">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <h3 className="text-body-base font-bold text-on-surface">Escrow Arbitration</h3>
              <IconButton
                iconName="close"
                ariaLabel="Close pane"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDispute(null)}
              />
            </div>

            <form onSubmit={handleResolve} className="flex flex-col gap-4">
              <div className="text-xs text-secondary flex flex-col gap-1">
                <span>**Disputed Milestone:** {selectedDispute.milestone?.title}</span>
                <span>**Total Payout Amount:** {formatCurrency(selectedDispute.milestone?.payout_amount || 0)}</span>
              </div>

              {/* Outcome Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Resolution Action</label>
                <select
                  value={outcome}
                  onChange={(e) => {
                    const val = e.target.value as "CLIENT_FAVORED" | "FREELANCER_FAVORED" | "PARTIAL_RESOLUTION";
                    setOutcome(val);
                    const payout = Number(selectedDispute.milestone?.payout_amount || 0);
                    if (val === "CLIENT_FAVORED") {
                      setClientAmount(payout);
                      setFreelancerAmount(0);
                    } else if (val === "FREELANCER_FAVORED") {
                      setClientAmount(0);
                      setFreelancerAmount(payout);
                    } else {
                      setClientAmount(payout / 2);
                      setFreelancerAmount(payout / 2);
                    }
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="CLIENT_FAVORED">Client Favored (100% Refund)</option>
                  <option value="FREELANCER_FAVORED">Freelancer Favored (100% Release)</option>
                  <option value="PARTIAL_RESOLUTION">Custom Splitting (Partial Resolution)</option>
                </select>
              </div>

              {/* Custom Split Inputs */}
              {outcome === "PARTIAL_RESOLUTION" && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Refund to Client</label>
                    <input
                      type="number"
                      step="0.01"
                      value={clientAmount}
                      onChange={(e) => setClientAmount(Number(e.target.value))}
                      className="h-10 px-3 rounded-lg border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Pay Freelancer</label>
                    <input
                      type="number"
                      step="0.01"
                      value={freelancerAmount}
                      onChange={(e) => setFreelancerAmount(Number(e.target.value))}
                      className="h-10 px-3 rounded-lg border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Justification note */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Resolution Note</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Provide audit reason / settlement terms..."
                  className="w-full min-h-[80px] p-3 rounded-lg border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                />
              </div>

              {errorMsg && (
                <div className="p-3 text-[10px] font-semibold text-error bg-error-container/10 border border-error/20 rounded-lg">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-3 text-[10px] font-semibold text-success bg-success-container/10 border border-success/20 rounded-lg">
                  {successMsg}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 text-xs flex items-center justify-center gap-1.5"
                disabled={isResolving}
              >
                {isResolving ? (
                  <>
                    <Spinner size="sm" />
                    <span>Processing Settlement...</span>
                  </>
                ) : (
                  <span>Commit Resolution</span>
                )}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6 text-center text-muted-foreground text-xs italic bg-surface-container/20 border border-outline-variant/20">
            Select an open dispute from the list to begin the arbitration split workflow.
          </Card>
        )}
      </div>
    </div>
  );
}

// Custom IconButton helper to fix missing import or scope issues
function IconButton({
  iconName,
  ariaLabel,
  onClick,
}: {
  iconName: string;
  ariaLabel: string;
  variant?: string;
  size?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="p-1 rounded-full hover:bg-outline-variant/25 transition-colors cursor-pointer text-secondary"
    >
      <span className="material-symbols-outlined text-[18px]">{iconName}</span>
    </button>
  );
}
