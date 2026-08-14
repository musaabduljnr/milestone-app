"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("ErrorBoundary caught runtime crash:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans select-none">
      <Card className="w-full max-w-md p-8 flex flex-col items-center gap-5 text-center bg-surface border border-outline-variant/35 shadow-modal">
        <div className="w-14 h-14 rounded-full bg-error-container/10 border border-error/25 flex items-center justify-center text-error">
          <span className="material-symbols-outlined text-[32px]">error</span>
        </div>
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Something went wrong</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">
            An unexpected error occurred during processing. Please try resetting the page context or return home.
          </p>
          {error?.message && (
            <p className="text-[9px] text-error font-data-mono bg-error-container/5 border border-error/10 p-2 rounded mt-3.5 select-text text-left max-h-24 overflow-y-auto break-all">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex gap-3 w-full mt-2">
          <Link href="/dashboard" className="flex-1">
            <Button variant="secondary" className="w-full">
              Dashboard
            </Button>
          </Link>
          <Button variant="primary" className="flex-1" onClick={reset}>
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
}
