import React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "white";
}

export const Spinner: React.FC<SpinnerProps> = ({
  className = "",
  size = "md",
  variant = "primary",
  ...props
}) => {
  const sizes = {
    sm: "text-[16px]",
    md: "text-[24px]",
    lg: "text-[32px]",
  };

  const variants = {
    primary: "text-primary",
    secondary: "text-secondary",
    white: "text-white",
  };

  return (
    <span
      className={`material-symbols-outlined animate-spin ${sizes[size]} ${variants[variant]} ${className}`}
      aria-hidden="true"
      {...props}
    >
      progress_activity
    </span>
  );
};
