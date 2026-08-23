import React from "react";
import { getSettingsAction } from "@/app/admin/actions";
import SettingsClient from "./SettingsClient";

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const res = await getSettingsAction();

  const defaultSettings = {
    enableRegistration: true,
    enableEscrowFunding: true,
    requireKycBeforeMilestone: true,
    simulatedLedgerLimit: 50000,
  };

  const settings = res.success && res.settings ? res.settings : defaultSettings;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          Platform Configuration Settings
        </h1>
        <p className="text-body-sm text-secondary">
          Configure platform feature flags, wallet limits, and KYC enforcement policies.
        </p>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  );
}
