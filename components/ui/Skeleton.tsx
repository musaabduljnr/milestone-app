import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rectangular" | "circular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  ...props
}) => {
  const baseStyle = "bg-surface-container-highest/60 animate-pulse shrink-0";

  const variants = {
    text: "h-3 w-3/4 rounded-full",
    rectangular: "rounded-md",
    circular: "rounded-full",
  };

  return <div className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />;
};
