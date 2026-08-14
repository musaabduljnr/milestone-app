"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

export interface VerificationCompleteProps {
  onContinue: () => void;
}

export const VerificationComplete: React.FC<VerificationCompleteProps> = ({
  onContinue,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 gap-6 max-w-sm mx-auto select-none">
      {/* Verified Success badge */}
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-success-container/20 text-success flex items-center justify-center border border-success/15 ring-8 ring-success/5">
          <span className="material-symbols-outlined text-[36px]">verified</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="font-headline-sm text-body-base font-bold text-on-surface">
          Identity verified
        </h2>
        <p className="font-body-sm text-xs text-muted-foreground leading-relaxed mt-1">
          Your identity verification is complete. You now have full permission to fund projects and start assigned milestone contracts.
        </p>
      </div>

      <Button
        type="button"
        variant="primary"
        onClick={onContinue}
        className="w-full h-11 flex items-center justify-center gap-1.5 mt-2"
      >
        <span>Continue to Milestone</span>
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </Button>
    </div>
  );
};

export default VerificationComplete;
