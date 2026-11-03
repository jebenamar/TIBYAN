import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "border-line-strong text-muted",
  gold: "border-line-gold bg-gold-soft text-gold-ink",
  jade: "border-accent/30 bg-accent-soft text-accent",
  warn: "border-danger/30 bg-danger/8 text-danger",
} as const;

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 tracking-wide", tones[tone], className)}
      {...props}
    />
  );
}
