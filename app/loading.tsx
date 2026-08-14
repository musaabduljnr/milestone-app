import React from "react";
import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8 select-none">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="md" className="text-primary" />
        <span className="font-label-caps text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
          Loading workspace...
        </span>
      </div>
    </div>
  );
}
