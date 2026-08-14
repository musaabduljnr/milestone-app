import React from "react";
import { Badge } from "@/components/ui/Badge";

export interface Transaction {
  id: string;
  date: string;
  projectName: string;
  milestoneName: string;
  type: string;
  status: "completed" | "secured" | "processing" | "failed";
  amount: number; // positive for earned, negative for funded/held
}

export interface EscrowLedgerProps {
  transactions: Transaction[];
  onViewFullHistory?: () => void;
}

export const EscrowLedger: React.FC<EscrowLedgerProps> = ({
  transactions,
  onViewFullHistory,
}) => {
  const getStatusBadge = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "secured":
        return <Badge variant="warning">Secured</Badge>;
      case "processing":
        return <Badge variant="info">Processing</Badge>;
      case "failed":
        return <Badge variant="error">Failed</Badge>;
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
          Transaction Ledger
        </h3>
        {onViewFullHistory && (
          <button
            onClick={onViewFullHistory}
            className="font-label-caps text-caption text-primary hover:underline"
          >
            View Full History
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-subtle">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-surface border-b border-outline-variant">
              <tr>
                <th className="py-3.5 px-4 font-label-caps text-caption text-muted-foreground font-medium">
                  Date
                </th>
                <th className="py-3.5 px-4 font-label-caps text-caption text-muted-foreground font-medium">
                  Project
                </th>
                <th className="py-3.5 px-4 font-label-caps text-caption text-muted-foreground font-medium">
                  Milestone
                </th>
                <th className="py-3.5 px-4 font-label-caps text-caption text-muted-foreground font-medium">
                  Type
                </th>
                <th className="py-3.5 px-4 font-label-caps text-caption text-muted-foreground font-medium">
                  Status
                </th>
                <th className="py-3.5 px-4 font-label-caps text-caption text-muted-foreground font-medium text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/50">
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <tr
                    key={tx.id}
                    className="even:bg-surface-bright hover:bg-surface-container-low transition-colors"
                  >
                    <td className="py-3.5 px-4 text-muted-foreground">{tx.date}</td>
                    <td className="py-3.5 px-4 font-semibold">{tx.projectName}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{tx.milestoneName}</td>
                    <td className="py-3.5 px-4">{tx.type}</td>
                    <td className="py-3.5 px-4">{getStatusBadge(tx.status)}</td>
                    <td
                      className={`py-3.5 px-4 text-right font-data-mono text-body-base font-semibold ${
                        isPositive ? "text-success" : "text-on-surface-variant"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      ${Math.abs(tx.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
