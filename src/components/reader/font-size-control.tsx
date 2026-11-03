"use client";

import { AArrowDown, AArrowUp } from "lucide-react";
import { useApp } from "@/components/providers";
import { Tooltip } from "@/components/ui/tooltip";

export function FontSizeControl() {
  const { t, prefs, updatePrefs } = useApp();
  const set = (d: number) => updatePrefs({ scale: Math.round(Math.min(1.8, Math.max(0.8, prefs.scale + d)) * 100) / 100 });
  const btn = "grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40";
  return (
    <div role="group" aria-label={t.reader.fontSize} className="flex items-center rounded-xl border border-line-strong bg-surface/70 p-0.5">
      <Tooltip label={t.reader.smaller}>
        <button type="button" className={btn} onClick={() => set(-0.1)} disabled={prefs.scale <= 0.8} aria-label={t.reader.smaller}>
          <AArrowDown className="size-4" />
        </button>
      </Tooltip>
      <span className="w-10 text-center text-[11px] tabular-nums text-muted" aria-live="polite">{Math.round(prefs.scale * 100)}%</span>
      <Tooltip label={t.reader.larger}>
        <button type="button" className={btn} onClick={() => set(0.1)} disabled={prefs.scale >= 1.8} aria-label={t.reader.larger}>
          <AArrowUp className="size-4" />
        </button>
      </Tooltip>
    </div>
  );
}
