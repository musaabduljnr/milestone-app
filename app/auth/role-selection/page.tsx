"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { selectRoleAction } from "@/app/auth/actions";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function RoleSelectionPage() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [selectedRole, setSelectedRole] = React.useState<"client" | "freelancer" | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      return errorParam ? decodeURIComponent(errorParam) : null;
    }
    return null;
  });

  const handleRoleSelect = (role: "client" | "freelancer") => {
    if (isPending) return;
    setSelectedRole(role);
    setErrorMsg(null);
    startTransition(async () => {
      const result = await selectRoleAction(role);
      if (result.success && result.redirect) {
        router.push(result.redirect);
      } else if (!result.success && result.redirect) {
        router.push(result.redirect);
      } else if (!result.success && result.error) {
        setErrorMsg(result.error);
        setSelectedRole(null);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl p-8 flex flex-col gap-6 shadow-modal">
        {/* Onboarding Header */}
        <div className="flex flex-col items-center text-center gap-1.5 select-none">
          <div className="w-10 h-10 rounded-full bg-primary-container/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">assignment_ind</span>
          </div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Choose your account role
          </h1>
          <p className="font-body-sm text-body-sm text-muted-foreground">
            Step 2 of 3: Define your dashboard workspace
          </p>
        </div>

        {/* Errors display */}
        {errorMsg && (
          <div className="p-4 rounded-lg bg-error-container/20 border border-error/15 text-error-container text-xs font-semibold leading-normal flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-[16px] mt-0.5">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Choice cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {/* Client Card */}
          <button
            onClick={() => handleRoleSelect("client")}
            disabled={isPending}
            className="w-full text-left focus:outline-none"
          >
            <Card
              variant="interactive"
              className={`p-6 flex flex-col gap-4 h-full relative group transition-all duration-300 ${
                selectedRole === "client" ? "border-primary ring-2 ring-primary/20" : ""
              } ${isPending && selectedRole !== "client" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="w-12 h-12 rounded-lg bg-primary-container/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform select-none">
                <span className="material-symbols-outlined text-[28px]">payments</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-body-base font-bold text-on-surface leading-tight">
                  I am a Client
                </h3>
                <p className="font-body-sm text-xs text-muted-foreground mt-2 leading-relaxed">
                  I want to list secure projects, fund milestones into escrow, review work deliverables, and hire freelancers.
                </p>
              </div>
              
              {isPending && selectedRole === "client" && (
                <div className="absolute right-4 top-4">
                  <Spinner size="sm" />
                </div>
              )}
            </Card>
          </button>

          {/* Freelancer Card */}
          <button
            onClick={() => handleRoleSelect("freelancer")}
            disabled={isPending}
            className="w-full text-left focus:outline-none"
          >
            <Card
              variant="interactive"
              className={`p-6 flex flex-col gap-4 h-full relative group transition-all duration-300 ${
                selectedRole === "freelancer" ? "border-primary ring-2 ring-primary/20" : ""
              } ${isPending && selectedRole !== "freelancer" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="w-12 h-12 rounded-lg bg-secondary-container text-primary border border-secondary-fixed-dim flex items-center justify-center group-hover:scale-105 transition-transform select-none">
                <span className="material-symbols-outlined text-[28px]">engineering</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-body-base font-bold text-on-surface leading-tight">
                  I am a Freelancer
                </h3>
                <p className="font-body-sm text-xs text-muted-foreground mt-2 leading-relaxed">
                  I want to search active contracts, work on assigned project milestones, submit deliverables, and get paid.
                </p>
              </div>

              {isPending && selectedRole === "freelancer" && (
                <div className="absolute right-4 top-4">
                  <Spinner size="sm" />
                </div>
              )}
            </Card>
          </button>
        </div>
      </Card>
    </div>
  );
}
