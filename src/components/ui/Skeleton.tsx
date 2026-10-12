import React from "react";

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200/80 dark:bg-zinc-800 ${className}`}
      {...props}
    />
  );
}

export default Skeleton;

