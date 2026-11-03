import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      dir="ltr"
      className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-surface px-1.5 font-sans text-[10px] font-medium text-muted", className)}
      {...props}
    />
  );
}
