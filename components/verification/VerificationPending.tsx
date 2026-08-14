"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { completeMockVerificationAction } from "@/app/auth/verification-actions";

export interface VerificationPendingProps {
  onComplete: () => void;
}

export const VerificationPending: React.FC<VerificationPendingProps> = ({
  onComplete,
}) => {
  const [status, setStatus] = React.useState<"completing" | "error">("completing");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const executeCompletion = React.useCallback(async () => {
    // Short simulated delay (e.g., 3 seconds) to represent reviewing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const res = await completeMockVerificationAction();
      if (res.success) {
        onComplete();
      } else {
        setStatus("error");
        setErrorMsg(res.error || "Failed to finalize verification. Please try again.");
      }
    } catch (err) {
      console.error("KYC mock completion error:", err);
      setStatus("error");
      const message = err instanceof Error ? err.message : "An unexpected server error occurred during verification.";
      setErrorMsg(message);
    }
  }, [onComplete]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      executeCompletion();
    }, 0);
    return () => clearTimeout(timer);
  }, [executeCompletion]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-8 gap-6 max-w-sm mx-auto">
      {status === "error" ? (
        <>
          <div className="w-14 h-14 rounded-full bg-error-container/20 text-error flex items-center justify-center border border-error/15">
            <span className="material-symbols-outlined text-[32px] select-none">error</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-headline-sm text-body-base font-bold text-on-surface">
              Verification Failed
            </h2>
            <p className="font-body-sm text-xs text-muted-foreground leading-relaxed">
              {errorMsg || "An error occurred while completing verification. Please check your data."}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setStatus("completing");
              setErrorMsg(null);
              executeCompletion();
            }}
            className="min-w-[160px] h-10 text-xs flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            <span>Retry Verification</span>
          </Button>
        </>
      ) : (
        <>
          {/* Animated pulsing spinner */}
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center ring-4 ring-primary/5 animate-pulse">
              <Spinner size="lg" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center">
              <Badge variant="neutral" className="bg-surface-container-high border-outline-variant/35 text-secondary font-bold uppercase tracking-widest text-[10px] px-2.5 py-1">
                PENDING
              </Badge>
            </div>
            <h2 className="font-headline-sm text-body-base font-bold text-on-surface mt-1 leading-snug">
              Verification in progress
            </h2>
            <p className="font-body-sm text-xs text-muted-foreground leading-relaxed mt-1">
              We&apos;re reviewing your information. You&apos;ll be able to continue once verification is complete.
            </p>
          </div>

          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest bg-surface-container/30 px-3 py-1.5 rounded-full select-none border border-outline-variant/20 animate-pulse">
            {status === "completing" ? "Finalizing database checks..." : "Verifying credentials..."}
          </div>
        </>
      )}
    </div>
  );
};

export default VerificationPending;
