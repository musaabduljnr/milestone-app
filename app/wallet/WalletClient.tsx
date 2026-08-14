"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { signOutAction } from "@/app/auth/actions";
import { topUpSimulatedFunds } from "@/app/wallet/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export interface LedgerItem {
  id: string;
  project_title: string;
  milestone_title: string;
  amount: number;
  entry_type: "FUNDED" | "HELD" | "RELEASED";
  status: "completed" | "secured" | "processing" | "failed";
  created_at: string;
}

export interface WalletClientProps {
  profile: {
    role: "client" | "freelancer";
    full_name: string;
    avatar_url?: string | null;
  };
  userEmail: string;
  wallet: {
    available_balance: number;
    pending_balance: number;
  } | null;
  ledger: LedgerItem[];
}

export default function WalletClient({
  profile,
  userEmail,
  wallet,
  ledger,
}: WalletClientProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleTopUp = (amount: number) => {
    if (isPending) return;
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await topUpSimulatedFunds(amount);
        if (!res.success) {
          setErrorMsg(res.error || "Top-up failed.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "A network error occurred.";
        setErrorMsg(message);
      }
    });
  };

  const available = wallet ? Number(wallet.available_balance) : 0;
  const held = wallet ? Number(wallet.pending_balance) : 0;
  const total = available + held;

  return (
    <AppShell
      activeRole={profile.role}
      activeMenuLabel="Wallet"
      userName={profile.full_name}
      userEmail={userEmail}
      userAvatarUrl={profile.avatar_url || undefined}
      onSignOut={signOutAction}
    >
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Warning Sandbox banner */}
        <div className="p-4 rounded-xl bg-primary-container/10 border border-primary/15 text-on-surface text-xs leading-normal flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5 select-none">
            info
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-primary">Simulated Sandbox Environment</span>
            <span className="text-muted-foreground text-[11px] mt-0.5">
              These balances and ledger audits are completely simulated for platform MVP demonstration. They carry no monetary value and are not connected to real banking systems.
            </span>
          </div>
        </div>

        {/* Errors display */}
        {errorMsg && (
          <div className="p-4 rounded-lg bg-error-container/20 border border-error/15 text-error-container text-xs font-semibold leading-normal flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-[16px] mt-0.5">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Balances grids */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 flex flex-col gap-1 border-primary/20 bg-surface-container-lowest">
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Available Balance</span>
            <span className="font-data-mono text-display-sm font-bold text-on-surface mt-1 block">
              ${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </Card>

          <Card className="p-6 flex flex-col gap-1 bg-surface-container-lowest">
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Held in Escrow</span>
            <span className="font-data-mono text-display-sm font-bold text-on-surface mt-1 block">
              ${held.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </Card>

          <Card className="p-6 flex flex-col gap-1 bg-surface-container-lowest">
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Total Balance</span>
            <span className="font-data-mono text-display-sm font-bold text-on-surface mt-1 block">
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </Card>
        </div>

        {/* Top-up sandbox widget (visible only to clients) */}
        {profile.role === "client" && (
          <Card className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-outline-variant/40 shadow-sm bg-surface-container-low">
            <div className="flex flex-col max-w-md">
              <h4 className="font-headline-sm text-body-base font-bold text-on-surface">
                Request Test Sandbox Funds
              </h4>
              <p className="font-body-sm text-xs text-muted-foreground mt-1">
                Top up your virtual account balance to test milestone contract creation and escrow payments.
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTopUp(5000)}
                disabled={isPending}
              >
                + $5,000
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTopUp(10000)}
                disabled={isPending}
              >
                {isPending ? <Spinner size="sm" /> : "+ $10,000"}
              </Button>
            </div>
          </Card>
        )}

        {/* Wallet ledger history activity table */}
        <div className="flex flex-col gap-4 mt-2">
          <h3 className="font-headline-sm text-body-base font-bold text-on-surface px-1">
            Wallet Activity Ledger History
          </h3>

          {ledger.length === 0 ? (
            <Card className="p-8 text-center min-h-[180px] flex flex-col items-center justify-center bg-surface-container-lowest">
              <span className="material-symbols-outlined text-muted-foreground text-[28px] mb-3 select-none">
                receipt_long
              </span>
              <h5 className="font-headline-sm text-body-sm font-bold text-on-surface leading-tight">
                No ledger logs found
              </h5>
              <p className="font-body-sm text-xs text-muted-foreground mt-1">
                Every transaction and project funding allocation audit trail will be logged here.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant/40 bg-surface">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/40 text-secondary uppercase font-bold tracking-wider">
                    <th className="p-4">Funding Date</th>
                    <th className="p-4">Project Contract</th>
                    <th className="p-4">Milestone Stage</th>
                    <th className="p-4 text-center">Type</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {ledger.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4 font-medium text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-semibold text-on-surface truncate max-w-xs">
                        {item.project_title}
                      </td>
                      <td className="p-4 text-secondary truncate max-w-xs">
                        {item.milestone_title}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[9px] bg-primary-container/10 text-primary border border-primary/20">
                          {item.entry_type}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[9px] bg-success-container/10 text-success border border-success/20">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-data-mono font-bold text-on-surface">
                        ${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
