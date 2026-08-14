import React from "react";

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = "", ...props }) => {
  return (
    <div className={`grid grid-cols-12 gap-6 w-full ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: "full" | "half" | "third" | "two-thirds";
  children: React.ReactNode;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  span = "full",
  children,
  className = "",
  ...props
}) => {
  const spans = {
    full: "col-span-12",
    half: "col-span-12 md:col-span-6",
    third: "col-span-12 md:col-span-6 lg:col-span-4",
    "two-thirds": "col-span-12 lg:col-span-8",
  };

  return (
    <div className={`${spans[span]} flex flex-col h-full ${className}`} {...props}>
      {children}
    </div>
  );
};
