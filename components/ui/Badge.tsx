import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className = "",
  variant = "neutral",
  size = "sm",
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-full uppercase tracking-wider text-center select-none";

  const variants = {
    success: "bg-success-container text-on-success-container border border-success/10",
    warning: "bg-secondary-container text-primary border border-secondary-fixed-dim",
    error: "bg-error-container text-on-error-container border border-error/10",
    info: "bg-primary-container/10 text-primary border border-primary/10",
    neutral: "bg-surface-container border border-outline-variant text-secondary",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px] leading-4",
    md: "px-2.5 py-1 text-xs leading-4",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </span>
  );
};
