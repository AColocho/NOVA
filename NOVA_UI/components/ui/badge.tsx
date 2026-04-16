import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
