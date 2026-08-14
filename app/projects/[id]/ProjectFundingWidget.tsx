"use client";

import React from "react";
import Link from "next/link";
import { fundProjectAction } from "@/app/wallet/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

export interface ProjectFundingWidgetProps {
  projectId: string;
  budget: number;
  currency: string;
  walletAvailable: number;
  isOwner: boolean;
  projectStatus: "draft" | "in_progress" | "completed" | "disputed";
  verificationStatus?: "pending" | "verified";
}

export default function ProjectFundingWidget({
  projectId,
  budget,
  currency,
  walletAvailable,
  isOwner,
  projectStatus,
  verificationStatus = "pending",
}: ProjectFundingWidgetProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleFundProject = () => {
    if (isPending) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await fundProjectAction(projectId);
        if (!res.success) {
          setErrorMsg(res.error || "Funding transaction failed.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "A network error occurred.";
        setErrorMsg(message);
      }
    });
  };

  const isFunded = projectStatus !== "draft";
  const hasSufficientFunds = walletAvailable >= budget;

  // Freelancers should not see actionable controls
  if (!isOwner) {
    return (
      <Card className="p-6 flex flex-col gap-4">
        <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider border-b border-outline-variant/30 pb-2">
          Project Funding
        </h3>
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">Status</span>
          <Badge variant={isFunded ? "success" : "neutral"}>
            {isFunded ? "Funded & Secured" : "Unfunded Draft"}
          </Badge>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-medium">Escrow Value</span>
          <span className="font-data-mono font-semibold text-on-surface">
            {currency} {budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 flex flex-col gap-4 relative">
      <h3 className="font-label-caps text-caption text-secondary font-bold uppercase tracking-wider border-b border-outline-variant/30 pb-2">
        Escrow Funding Panel
      </h3>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-error-container/20 border border-error/15 text-error-container text-[11px] font-semibold leading-normal flex items-start gap-2">
          <span className="material-symbols-outlined text-error text-[14px] mt-0.5 select-none">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Funding Status</span>
          <Badge variant={isFunded ? "success" : "neutral"}>
            {isFunded ? "Funded & Secured" : "Unfunded Draft"}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Required Budget</span>
          <span className="font-data-mono font-semibold text-on-surface">
            {currency} {budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        {!isFunded && (
          <div className="flex justify-between items-center border-t border-outline-variant/30 pt-3">
            <span className="text-muted-foreground font-medium">Available Balance</span>
            <span
              className={`font-data-mono font-bold ${
                hasSufficientFunds ? "text-success" : "text-error"
              }`}
            >
              {currency} {walletAvailable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {!isFunded && (
        <div className="pt-2">
          {verificationStatus !== "verified" ? (
            <div className="p-4 rounded-xl border border-warning/20 bg-warning-container/5 flex flex-col gap-3">
              <div className="flex items-start gap-2.5 text-warning font-semibold text-xs">
                <span className="material-symbols-outlined text-[18px] select-none">gavel</span>
                <span>Identity verification required</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                You must verify your identity before you can fund projects or release payments.
              </p>
              <Link href="/verification">
                <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                  <span>Verify identity</span>
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Button
                variant="primary"
                className="w-full flex items-center justify-center gap-1.5"
                onClick={handleFundProject}
                disabled={isPending || !hasSufficientFunds}
              >
                {isPending ? (
                  <Spinner size="sm" />
                ) : !hasSufficientFunds ? (
                  "Insufficient Balance"
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                    <span>Fund Project</span>
                  </>
                )}
              </Button>
              {!hasSufficientFunds && (
                <p className="text-[10px] text-error font-medium text-center mt-2 leading-tight">
                  Please top up your wallet available balance.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {isFunded && (
        <div className="p-3 rounded-lg bg-success-container/10 border border-success/15 flex items-center gap-2 text-success text-[10px] font-bold uppercase tracking-wide justify-center select-none mt-1">
          <span className="material-symbols-outlined text-[14px]">verified</span>
          <span>Funds Secured in Escrow</span>
        </div>
      )}
    </Card>
  );
}
