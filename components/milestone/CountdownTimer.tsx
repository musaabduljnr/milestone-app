"use client";

import React from "react";

export interface CountdownTimerProps {
  submittedAt: string | Date;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  submittedAt,
  className = "",
}) => {
  const [timeLeft, setTimeLeft] = React.useState<string>("Calculating...");
  const [isExpired, setIsExpired] = React.useState<boolean>(false);

  React.useEffect(() => {
    const submittedDate = new Date(submittedAt);
    const targetDate = new Date(submittedDate.getTime() + 72 * 60 * 60 * 1000); // 72 hours later

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Auto-releasing...");
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      setIsExpired(false);
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);

    return () => clearInterval(timerId);
  }, [submittedAt]);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="material-symbols-outlined text-[16px] text-warning select-none">
        schedule
      </span>
      <span className={`font-data-mono font-bold text-xs tracking-tight ${isExpired ? "text-error" : "text-warning"}`}>
        {timeLeft}
      </span>
    </div>
  );
};
