"use client";

import { Popover as P } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({ className, align = "center", sideOffset = 8, ...props }: ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={sideOffset}
        className={cn("z-50 w-80 rounded-2xl border border-line-strong bg-surface p-4 shadow-lift outline-none data-[state=open]:animate-[pop-in_180ms_cubic-bezier(0.16,1,0.3,1)]", className)}
        {...props}
      />
    </P.Portal>
  );
}
