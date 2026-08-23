"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { saveSettingsAction } from "@/app/admin/actions";

interface SettingsClientProps {
  initialSettings: {
    enableRegistration: boolean;
    enableEscrowFunding: boolean;
    requireKycBeforeMilestone: boolean;
    simulatedLedgerLimit: number;
  };
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [enableRegistration, setEnableRegistration] = React.useState(initialSettings.enableRegistration);
  const [enableEscrowFunding, setEnableEscrowFunding] = React.useState(initialSettings.enableEscrowFunding);
  const [requireKycBeforeMilestone, setRequireKycBeforeMilestone] = React.useState(initialSettings.requireKycBeforeMilestone);
  const [simulatedLedgerLimit, setSimulatedLedgerLimit] = React.useState(initialSettings.simulatedLedgerLimit);

  const [isSaving, setIsSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await saveSettingsAction({
        enableRegistration,
        enableEscrowFunding,
        requireKycBeforeMilestone,
        simulatedLedgerLimit: Number(simulatedLedgerLimit),
      });

      if (res.success) {
        setSuccessMsg("Platform operational configurations saved successfully!");
      } else {
        setErrorMsg(res.error || "Failed to save configuration settings.");
      }
    } catch {
      setErrorMsg("An unexpected client error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-xs">
          {/* Toggles */}
          <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-4">
            <h3 className="text-body-sm font-bold text-on-surface">Platform Feature Flags</h3>
            
            {/* Toggle 1: User Registrations */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container/50 border border-outline-variant/35">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="font-bold text-on-surface">Allow User Registration</span>
                <span className="text-[10px] text-secondary">Enable or disable new user signups from `/auth/signup`.</span>
              </div>
              <input
                type="checkbox"
                checked={enableRegistration}
                onChange={(e) => setEnableRegistration(e.target.checked)}
                className="w-5 h-5 rounded border-outline focus:ring-primary cursor-pointer text-primary"
              />
            </div>

            {/* Toggle 2: Escrow Funding */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container/50 border border-outline-variant/35">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="font-bold text-on-surface">Enable Escrow Funding</span>
                <span className="text-[10px] text-secondary">Allow clients to fund contract milestones from their wallets.</span>
              </div>
              <input
                type="checkbox"
                checked={enableEscrowFunding}
                onChange={(e) => setEnableEscrowFunding(e.target.checked)}
                className="w-5 h-5 rounded border-outline focus:ring-primary cursor-pointer text-primary"
              />
            </div>

            {/* Toggle 3: Enforce KYC Check */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container/50 border border-outline-variant/35">
              <div className="flex flex-col gap-0.5 max-w-[80%]">
                <span className="font-bold text-on-surface">Enforce KYC Onboarding</span>
                <span className="text-[10px] text-secondary">Block users from contract workflows unless their verification status is &apos;verified&apos;.</span>
              </div>
              <input
                type="checkbox"
                checked={requireKycBeforeMilestone}
                onChange={(e) => setRequireKycBeforeMilestone(e.target.checked)}
                className="w-5 h-5 rounded border-outline focus:ring-primary cursor-pointer text-primary"
              />
            </div>
          </div>

          {/* Simulated balance limits */}
          <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-4">
            <h3 className="text-body-sm font-bold text-on-surface">Ledger Simulation Limits</h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-secondary uppercase">
                Simulated Balance Cap (per User Wallet)
              </label>
              <input
                type="number"
                value={simulatedLedgerLimit}
                onChange={(e) => setSimulatedLedgerLimit(Number(e.target.value))}
                placeholder="e.g. 50000"
                className="h-10 px-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-semibold w-full md:w-64"
                required
              />
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Restricts the maximum simulated funds a user can add to their simulated wallet ledger at once.
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 text-[10px] font-semibold text-error bg-error-container/10 border border-error/20 rounded-lg">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-[10px] font-semibold text-success bg-success-container/10 border border-success/20 rounded-lg">
              {successMsg}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full md:w-auto min-w-[160px] h-10 text-xs flex items-center justify-center gap-1.5"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <span>Save Platform Settings</span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
