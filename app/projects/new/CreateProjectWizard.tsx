"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/app/auth/actions";
import { createProjectAction } from "@/app/projects/actions";
import { ProjectBasicsStep, ProjectBasicsData } from "@/components/milestone/ProjectBasicsStep";
import { BudgetStep, ProjectBudgetData } from "@/components/milestone/BudgetStep";
import { MilestonesStep, MilestoneStepData, FreelancerProfile } from "@/components/milestone/MilestonesStep";
import { AssignmentStep } from "@/components/milestone/AssignmentStep";
import { ReviewStep } from "@/components/milestone/ReviewStep";

export interface CreateProjectWizardProps {
  freelancers: FreelancerProfile[];
  userEmail: string;
  profileName: string;
}

export type WizardSubmissionState = "IDLE" | "SUBMITTING" | "SUCCESS" | "ERROR";

export default function CreateProjectWizard({
  freelancers,
  userEmail,
  profileName,
}: CreateProjectWizardProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [submissionState, setSubmissionState] = React.useState<WizardSubmissionState>("IDLE");
  const [createdProjectId, setCreatedProjectId] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // 1. Basics Form State
  const [basics, setBasics] = React.useState<ProjectBasicsData>({
    title: "",
    description: "",
    category: "",
    expectedCompletion: "",
  });

  // 2. Budget Form State
  const [budget, setBudget] = React.useState<ProjectBudgetData>({
    budget: 0,
    currency: "USD",
  });

  // 3. Milestones List State (Initialize with 2 items to enforce min limit)
  const [milestones, setMilestones] = React.useState<MilestoneStepData[]>([
    {
      title: "Architecture Draft",
      description: "Initial database diagrams and setup guidelines.",
      payout_amount: 0,
      deadline: "",
      assigned_freelancer_id: null,
      assigned_freelancer_email: null,
      assigned_freelancer_name: null,
    },
    {
      title: "UI Prototype Setup",
      description: "Deliver static mockup interfaces aligned with audited layout guidelines.",
      payout_amount: 0,
      deadline: "",
      assigned_freelancer_id: null,
      assigned_freelancer_email: null,
      assigned_freelancer_name: null,
    },
  ]);

  const handleNext = () => setStep((s) => Math.min(5, s + 1));
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (submissionState === "SUBMITTING") return;
    setSubmissionState("SUBMITTING");
    setErrorMsg(null);

    // Validate milestone deadlines before parsing
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      if (!m.deadline || !m.deadline.trim()) {
        setErrorMsg(`Please set a deadline for Milestone ${i + 1} ("${m.title}").`);
        setSubmissionState("ERROR");
        return;
      }
      if (!m.title || !m.title.trim()) {
        setErrorMsg(`Milestone ${i + 1} requires a valid title.`);
        setSubmissionState("ERROR");
        return;
      }
      if (m.payout_amount <= 0) {
        setErrorMsg(`Milestone ${i + 1} requires a payout amount greater than 0.`);
        setSubmissionState("ERROR");
        return;
      }
    }

    // Format milestones payloads safely
    const formattedMilestones = milestones.map((m) => {
      let isoDeadline = m.deadline;
      try {
        if (!m.deadline.includes("T")) {
          isoDeadline = new Date(m.deadline).toISOString();
        }
      } catch {
        isoDeadline = new Date().toISOString();
      }

      return {
        title: m.title.trim(),
        description: (m.description || "").trim(),
        payout_amount: m.payout_amount,
        deadline: isoDeadline,
        assigned_freelancer_id: m.assigned_freelancer_id || null,
        assigned_freelancer_email: m.assigned_freelancer_email || null,
      };
    });

    try {
      const response = await createProjectAction({
        title: basics.title.trim(),
        description: basics.description.trim(),
        category: basics.category.trim(),
        budget: budget.budget,
        currency: budget.currency || "USD",
        expected_completion: basics.expectedCompletion,
        milestones: formattedMilestones,
      });

      if (!response.success) {
        setErrorMsg(
          response.error ||
            "Something went wrong while creating your project. Your project was not created."
        );
        setSubmissionState("ERROR");
      } else if (response.projectId) {
        setCreatedProjectId(response.projectId);
        setSubmissionState("SUCCESS");
      } else {
        setErrorMsg("Failed to verify created project record.");
        setSubmissionState("ERROR");
      }
    } catch (err) {
      console.error("Project submission error:", err);
      const message =
        err instanceof Error ? err.message : "A network error occurred while submitting.";
      setErrorMsg(message);
      setSubmissionState("ERROR");
    }
  };

  // Summary statistics for Success Screen
  const invitedCount = milestones.filter(
    (m) => m.assigned_freelancer_email || m.assigned_freelancer_id
  ).length;

  return (
    <AppShell
      activeRole="client"
      activeMenuLabel="Overview"
      userName={profileName}
      userEmail={userEmail}
      onSignOut={signOutAction}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Step Indicator Header Widget (Only shown when not completed) */}
        {submissionState !== "SUCCESS" && (
          <div className="flex justify-between items-center bg-surface border border-outline-variant/40 rounded-xl px-5 py-3 select-none">
            <div className="flex flex-col">
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                Step {step} of 5
              </span>
              <span className="font-body-base text-body-sm font-bold text-on-surface mt-0.5">
                {step === 1 && "Project Details"}
                {step === 2 && "Finances & Currency"}
                {step === 3 && "Milestone Timeline Setup"}
                {step === 4 && "Freelancer Assignment"}
                {step === 5 && "Review Submission"}
              </span>
            </div>

            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    idx === step
                      ? "bg-primary scale-110"
                      : idx < step
                      ? "bg-primary-container"
                      : "bg-outline-variant/50"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Wizard step error alert */}
        {errorMsg && submissionState !== "SUCCESS" && (
          <div className="p-4 rounded-xl bg-error-container/20 border border-error/25 text-error-container text-xs font-semibold leading-normal flex items-start gap-3 animate-fade-in shadow-sm">
            <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0">
              error
            </span>
            <div className="flex-1 flex flex-col gap-1">
              <span className="font-bold text-on-surface">Submission Error</span>
              <span className="text-secondary">{errorMsg}</span>
            </div>
            {submissionState === "ERROR" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSubmit}
                className="text-xs h-7 px-2.5 text-error hover:bg-error-container/20 shrink-0"
              >
                Try Again
              </Button>
            )}
          </div>
        )}

        {/* Dynamic Step Container or Success Screen */}
        <Card className="p-8 shadow-modal">
          {submissionState === "SUCCESS" && createdProjectId ? (
            /* Explicit Success Confirmation Screen (Resolves BUG 2) */
            <div className="flex flex-col items-center text-center py-6 gap-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-success-container/30 border-2 border-success/40 text-success flex items-center justify-center animate-scale-in">
                <span className="material-symbols-outlined text-[36px]">check_circle</span>
              </div>

              <div className="flex flex-col gap-2 max-w-md">
                <span className="font-label-caps text-xs text-success font-bold uppercase tracking-wider">
                  Contract Initialized
                </span>
                <h2 className="font-headline-lg text-headline-sm md:text-headline-lg font-bold text-on-surface">
                  Project Created Successfully!
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Your project contract has been created.
                  {invitedCount > 0
                    ? ` Freelancer invitations for ${invitedCount} milestone${
                        invitedCount > 1 ? "s" : ""
                      } have been sent.`
                    : " You can invite freelancers to milestones anytime."}
                </p>
              </div>

              {/* Summary Card */}
              <div className="w-full max-w-lg p-4 rounded-xl bg-surface-container border border-outline-variant/50 text-left grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Project
                  </span>
                  <span className="text-xs font-bold text-on-surface truncate">{basics.title}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Budget
                  </span>
                  <span className="font-data-mono text-xs font-bold text-primary">
                    {budget.currency} {budget.budget.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Milestones
                  </span>
                  <span className="text-xs font-bold text-on-surface">
                    {milestones.length} phases
                  </span>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
                <Link href={`/projects/${createdProjectId}`} className="flex-1">
                  <Button variant="primary" className="w-full h-11 text-xs sm:text-sm">
                    <span className="material-symbols-outlined text-[18px] mr-1.5">visibility</span>
                    View Project
                  </Button>
                </Link>
                <Link href="/dashboard" className="flex-1">
                  <Button variant="ghost" className="w-full h-11 text-xs sm:text-sm border border-outline-variant/50">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Multi-step Form Content */
            <>
              {step === 1 && (
                <ProjectBasicsStep
                  data={basics}
                  onChange={(f) => setBasics((prev) => ({ ...prev, ...f }))}
                  onNext={handleNext}
                />
              )}

              {step === 2 && (
                <BudgetStep
                  data={budget}
                  onChange={(f) => setBudget((prev) => ({ ...prev, ...f }))}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {step === 3 && (
                <MilestonesStep
                  milestones={milestones}
                  onChange={setMilestones}
                  totalBudget={budget.budget}
                  currency={budget.currency}
                  freelancers={freelancers}
                  onNext={handleNext}
                  onBack={handleBack}
                  projectTitle={basics.title}
                  projectDesc={basics.description}
                  projectCategory={basics.category}
                  expectedCompletion={basics.expectedCompletion}
                />
              )}

              {step === 4 && (
                <AssignmentStep
                  milestones={milestones}
                  onChange={setMilestones}
                  freelancers={freelancers}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {step === 5 && (
                <ReviewStep
                  basics={basics}
                  budget={budget}
                  milestones={milestones}
                  freelancers={freelancers}
                  onSubmit={handleSubmit}
                  onBack={handleBack}
                  isSubmitting={submissionState === "SUBMITTING"}
                />
              )}
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
