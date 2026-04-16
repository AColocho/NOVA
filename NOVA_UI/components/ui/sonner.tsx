"use client";

import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      toastOptions={{
        classNames: {
          toast:
            "rounded-[1.25rem] border border-white/80 bg-white text-foreground shadow-[var(--shadow-soft)]",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
