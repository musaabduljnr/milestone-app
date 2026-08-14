"use client";

import React from "react";
import { Progress } from "@/components/ui/Progress";

export interface VerificationProgressProps {
  currentStep: number; // 1, 2, or 3
}

export const VerificationProgress: React.FC<VerificationProgressProps> = ({
  currentStep,
}) => {
  const steps = [
    { num: 1, label: "Personal details" },
    { num: 2, label: "Photo ID" },
    { num: 3, label: "Review" },
  ];

  return (
    <div className="flex flex-col gap-3 w-full my-2">
      {/* Segmented bar */}
      <Progress segmentsCount={3} activeSegmentIndex={currentStep} />
      
      {/* Labels */}
      <div className="flex justify-between items-center text-[11px] font-semibold text-secondary select-none px-1">
        {steps.map((s) => {
          const isActive = s.num === currentStep;
          const isCompleted = s.num < currentStep;
          return (
            <div
              key={s.num}
              className={`flex items-center gap-1 transition-colors ${
                isActive
                  ? "text-primary font-bold"
                  : isCompleted
                  ? "text-success"
                  : "text-muted-foreground"
              }`}
            >
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[9px] scale-95 shrink-0 border-current">
                {isCompleted ? "✓" : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationProgress;
