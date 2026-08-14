"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
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

export default function CreateProjectWizard({
  freelancers,
  userEmail,
  profileName,
}: CreateProjectWizardProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
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
    },
    {
      title: "UI Prototype Setup",
      description: "Deliver static mockup interfaces aligned with audited layout guidelines.",
      payout_amount: 0,
      deadline: "",
      assigned_freelancer_id: null,
    },
  ]);

  const handleNext = () => setStep((s) => Math.min(5, s + 1));
  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    // Prepare milestones payouts and format payload
    const formattedMilestones = milestones.map((m) => ({
      title: m.title,
      description: m.description,
      payout_amount: m.payout_amount,
      deadline: new Date(m.deadline).toISOString(),
      assigned_freelancer_id: m.assigned_freelancer_id || null,
    }));

    try {
      const response = await createProjectAction({
        title: basics.title,
        description: basics.description,
        category: basics.category,
        budget: budget.budget,
        currency: budget.currency,
        expected_completion: basics.expectedCompletion,
        milestones: formattedMilestones,
      });

      if (!response.success) {
        setErrorMsg(response.error || "An unexpected error occurred.");
        setIsSubmitting(false);
      } else if (response.projectId) {
        // Redirect immediately to detail page upon successful creation
        router.push(`/projects/${response.projectId}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "A network error occurred while submitting.";
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      activeRole="client"
      activeMenuLabel="Overview"
      userName={profileName}
      userEmail={userEmail}
      onSignOut={signOutAction}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Step Indicator Header Widget */}
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

        {/* Wizard step errors */}
        {errorMsg && step === 5 && (
          <div className="p-4 rounded-lg bg-error-container/20 border border-error/15 text-error-container text-xs font-semibold leading-normal flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-[16px] mt-0.5">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Step Forms Container */}
        <Card className="p-8 shadow-modal">
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
              isSubmitting={isSubmitting}
            />
          )}
        </Card>
      </div>
    </AppShell>
  );
}
