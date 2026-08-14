import React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0 to 100
  segmentsCount?: number; // if > 1, render segmented segments
  activeSegmentIndex?: number; // 1-indexed, representing current segment in progress
}

export const Progress: React.FC<ProgressProps> = ({
  className = "",
  value = 0,
  segmentsCount = 1,
  activeSegmentIndex = 1,
  ...props
}) => {
  const percent = Math.min(100, Math.max(0, value));

  if (segmentsCount > 1) {
    return (
      <div className={`flex gap-1 w-full h-1.5 ${className}`} {...props}>
        {Array.from({ length: segmentsCount }).map((_, index) => {
          const itemIndex = index + 1;
          let segmentBg = "bg-surface-container-highest"; // default empty state
          
          if (itemIndex < activeSegmentIndex) {
            segmentBg = "bg-primary"; // completed state
          } else if (itemIndex === activeSegmentIndex) {
            segmentBg = "bg-primary animate-pulse"; // active state
          }

          return (
            <div
              key={index}
              className={`flex-1 h-full rounded-full transition-all duration-300 ${segmentBg}`}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full h-2 bg-surface-container-high rounded-full overflow-hidden ${className}`}
      {...props}
    >
      <div
        className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};
