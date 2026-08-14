"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export interface VerificationReviewProps {
  fullName: string;
  dob: string;
  filename: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export const VerificationReview: React.FC<VerificationReviewProps> = ({
  fullName,
  dob,
  filename,
  isSubmitting,
  onSubmit,
  onBack,
}) => {
  // Format Date of Birth for reading (e.g. YYYY-MM-DD to readable style if we want, or keep it clean)
  const readableDob = React.useMemo(() => {
    try {
      return new Date(dob).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dob;
    }
  }, [dob]);

  return (
    <div className="flex flex-col gap-5 mt-2">
      <div>
        <h2 className="text-body-base font-bold text-on-surface">Review verification info</h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Please confirm that the information below matches your official identity document. Once submitted, your profile will be locked for review.
        </p>
      </div>

      {/* Review Details block */}
      <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-low/40 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
              Full Name
            </span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              {fullName}
            </span>
          </div>

          {/* Date of Birth */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
              Date of Birth
            </span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              {readableDob}
            </span>
          </div>
        </div>

        <div className="h-[1px] bg-outline-variant/30 w-full" />

        {/* Uploaded Document filename */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
            Uploaded Document Reference
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="material-symbols-outlined text-[20px] text-success select-none">
              assignment_turned_in
            </span>
            <span className="font-label-sm text-xs font-semibold text-on-surface truncate">
              {filename}
            </span>
          </div>
        </div>
      </div>

      {/* Info Warning Alert */}
      <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/30 text-[11px] text-muted-foreground leading-normal flex items-start gap-2 select-none">
        <span className="material-symbols-outlined text-outline text-[16px] mt-0.5">info</span>
        <span>
          Milestone simulates identity checks. Your profile details and uploaded files are saved in secure development storage.
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-4 border-t border-outline-variant/20 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 h-11"
        >
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-6 h-11 min-w-[180px] flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Submit for verification</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VerificationReview;
