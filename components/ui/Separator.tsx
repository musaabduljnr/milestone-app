import React from "react";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const Separator: React.FC<SeparatorProps> = ({
  className = "",
  orientation = "horizontal",
  ...props
}) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`bg-outline-variant/30 shrink-0 ${
        orientation === "horizontal" ? "h-[1px] w-full" : "w-[1px] h-full"
      } ${className}`}
      {...props}
    />
  );
};
