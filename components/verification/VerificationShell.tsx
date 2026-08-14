"use client";

import React from "react";
import { Card } from "@/components/ui/Card";

export interface VerificationShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const VerificationShell: React.FC<VerificationShellProps> = ({
  children,
  title = "Verify your identity",
  subtitle = "Step 3 of 3: Identity Verification",
}) => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-xl p-6 md:p-8 flex flex-col gap-6 shadow-modal border-outline-variant/40 bg-surface">
        {/* Onboarding Header */}
        <div className="flex flex-col items-center text-center gap-1.5 select-none pb-4 border-b border-outline-variant/20">
          <div className="w-12 h-12 rounded-full bg-primary-container/10 text-primary flex items-center justify-center border border-primary/10">
            <span className="material-symbols-outlined text-[28px]">fingerprint</span>
          </div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface mt-2">
            {title}
          </h1>
          {subtitle && (
            <p className="font-body-sm text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {/* Content body */}
        <div className="flex flex-col gap-4 flex-1">
          {children}
        </div>
      </Card>
    </div>
  );
};

export default VerificationShell;
