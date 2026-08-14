"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { VerificationShell } from "@/components/verification/VerificationShell";
import { VerificationProgress } from "@/components/verification/VerificationProgress";
import { PersonalDetailsForm } from "@/components/verification/PersonalDetailsForm";
import { IdentityDocumentUpload } from "@/components/verification/IdentityDocumentUpload";
import { VerificationReview } from "@/components/verification/VerificationReview";
import { VerificationPending } from "@/components/verification/VerificationPending";
import { VerificationComplete } from "@/components/verification/VerificationComplete";
import { Button } from "@/components/ui/Button";
import {
  saveVerificationDetails,
  associateVerificationDocument,
  startMockVerificationAction,
} from "@/app/auth/verification-actions";

export interface VerificationClientProps {
  profile: {
    id: string;
    full_name: string;
    role: "client" | "freelancer";
    verification_status: "pending" | "verified";
    date_of_birth: string;
    photo_id_path: string;
    verification_started_at: string | null;
  };
  userEmail: string;
}

type Step = "INTRO" | "DETAILS" | "UPLOAD" | "REVIEW" | "PENDING" | "COMPLETE";

export default function VerificationClient({
  profile,
}: VerificationClientProps) {
  const router = useRouter();

  // Determine initial step based on profile kyc state
  const [step, setStep] = React.useState<Step>(() => {
    if (profile.verification_status === "verified") {
      return "COMPLETE";
    }
    // If pending, and started_at is set, check if they finished the form
    if (profile.verification_status === "pending" && profile.verification_started_at && profile.photo_id_path) {
      return "PENDING";
    }
    return "INTRO";
  });

  // Local state to collect data across steps
  const [fullName, setFullName] = React.useState(profile.full_name);
  const [dob, setDob] = React.useState(profile.date_of_birth);
  const [photoIdPath, setPhotoIdPath] = React.useState(profile.photo_id_path);
  const [uploadedFilename, setUploadedFilename] = React.useState(() => {
    if (profile.photo_id_path) {
      const parts = profile.photo_id_path.split("/");
      return parts[parts.length - 1] || "Uploaded_Document";
    }
    return "";
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleStart = () => setStep("DETAILS");
  
  const handleDetailsSubmit = (data: { fullName: string; dob: string }) => {
    setFullName(data.fullName);
    setDob(data.dob);
    setStep("UPLOAD");
  };

  const handleUploadComplete = (path: string, name: string) => {
    setPhotoIdPath(path);
    setUploadedFilename(name);
  };

  const handleUploadContinue = () => {
    setStep("REVIEW");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Save personal details (Name, DOB)
      const saveRes = await saveVerificationDetails(fullName, dob);
      if (!saveRes.success) {
        throw new Error(saveRes.error || "Failed to save personal details.");
      }

      // 2. Associate photo ID path
      const docRes = await associateVerificationDocument(photoIdPath);
      if (!docRes.success) {
        throw new Error(docRes.error || "Failed to associate document.");
      }

      // 3. Call DB RPC start_mock_verification to set status = 'pending'
      const startRes = await startMockVerificationAction();
      if (!startRes.success) {
        throw new Error(startRes.error || "Failed to start mock verification process.");
      }

      setStep("PENDING");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred during submission.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationComplete = () => {
    setStep("COMPLETE");
  };

  const handleDashboardRedirect = () => {
    router.push("/dashboard");
    router.refresh();
  };

  // adapt role-specific text
  const roleCopy = {
    requiredBefore: profile.role === "client" 
      ? "Required before funding project escrow contracts."
      : "Required before starting milestone assignments.",
    benefitRequirement: profile.role === "client"
      ? "Fund projects into escrow safely"
      : "Begin work on milestones and withdraw payouts",
  };

  return (
    <div className="w-full">
      {step === "INTRO" && (
        <VerificationShell
          title="Verify your identity"
          subtitle="Verification helps keep Milestone safe for clients and freelancers."
        >
          <div className="flex flex-col gap-6 select-none mt-2">
            <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
              Identity Verification
            </span>

            {/* List of benefits */}
            <div className="flex flex-col gap-4">
              {/* Benefit 1 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/35 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <h3 className="font-label-md text-label-md text-on-surface font-bold">
                    Secure information
                  </h3>
                  <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                    Your documentation is protected by high-standard database security and storage RLS rules.
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/35 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <h3 className="font-label-md text-label-md text-on-surface font-bold">
                    Simple verification process
                  </h3>
                  <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                    Provide basic personal details, upload a photo ID document, and receive verification feedback.
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/35 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                </div>
                <div className="flex flex-col gap-0.5 text-left">
                  <h3 className="font-label-md text-label-md text-on-surface font-bold">
                    {roleCopy.requiredBefore}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                    Required for both roles to maintain trust. You can {roleCopy.benefitRequirement.toLowerCase()}.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA action */}
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-end">
              <Button
                variant="primary"
                onClick={handleStart}
                className="w-full sm:w-auto px-6 h-11"
              >
                Get started
              </Button>
            </div>
          </div>
        </VerificationShell>
      )}

      {step === "DETAILS" && (
        <VerificationShell
          title="Verify your identity"
          subtitle="Step 1 of 3: Enter your details"
        >
          <VerificationProgress currentStep={1} />
          <PersonalDetailsForm
            initialFullName={fullName}
            initialDob={dob}
            onSubmit={handleDetailsSubmit}
            onBack={() => setStep("INTRO")}
          />
        </VerificationShell>
      )}

      {step === "UPLOAD" && (
        <VerificationShell
          title="Verify your identity"
          subtitle="Step 2 of 3: Document Upload"
        >
          <VerificationProgress currentStep={2} />
          <IdentityDocumentUpload
            userId={profile.id}
            initialFilePath={photoIdPath}
            initialFileName={uploadedFilename}
            onUploadComplete={handleUploadComplete}
            onBack={() => setStep("DETAILS")}
            onContinue={handleUploadContinue}
          />
        </VerificationShell>
      )}

      {step === "REVIEW" && (
        <VerificationShell
          title="Verify your identity"
          subtitle="Step 3 of 3: Final Review"
        >
          <VerificationProgress currentStep={3} />
          {errorMsg && (
            <div className="p-3 rounded-lg bg-error-container/20 border border-error/15 text-error text-[11px] font-semibold leading-normal flex items-start gap-2 select-none mb-2">
              <span className="material-symbols-outlined text-error text-[14px] mt-0.5">error</span>
              <span>{errorMsg}</span>
            </div>
          )}
          <VerificationReview
            fullName={fullName}
            dob={dob}
            filename={uploadedFilename}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onBack={() => setStep("UPLOAD")}
          />
        </VerificationShell>
      )}

      {step === "PENDING" && (
        <VerificationShell
          title="Identity Verification"
          subtitle=""
        >
          <VerificationPending onComplete={handleVerificationComplete} />
        </VerificationShell>
      )}

      {step === "COMPLETE" && (
        <VerificationShell
          title="Identity Verification"
          subtitle=""
        >
          <VerificationComplete onContinue={handleDashboardRedirect} />
        </VerificationShell>
      )}
    </div>
  );
}
