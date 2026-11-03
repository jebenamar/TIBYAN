"use client";

import { Tooltip as T } from "radix-ui";
import type { ReactNode } from "react";

export const TooltipProvider = T.Provider;

export function Tooltip({ label, children, side = "bottom" }: { label: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Root delayDuration={350}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={8}
          className="z-[60] rounded-lg border border-line-strong bg-ink px-2.5 py-1.5 text-xs text-bg shadow-lift"
        >
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
