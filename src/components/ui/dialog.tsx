"use client";

import { Dialog as D } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export const DialogTitle = D.Title;
export const DialogDescription = D.Description;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof D.Content>) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-bg-deep/55 backdrop-blur-sm data-[state=open]:animate-[fade-in_160ms_ease-out]" />
      <D.Content
        className={cn(
          "fixed inset-x-3 top-[8vh] z-50 mx-auto max-w-2xl rounded-2xl border border-line-strong bg-surface shadow-lift outline-none data-[state=open]:animate-[pop-in_220ms_cubic-bezier(0.16,1,0.3,1)] sm:inset-x-6",
          className,
        )}
        {...props}
      >
        {children}
      </D.Content>
    </D.Portal>
  );
}
