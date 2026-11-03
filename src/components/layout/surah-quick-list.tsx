"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/components/providers";
import { num } from "@/i18n/dictionaries";
import { matchSurahs, SURAHS, surahDisplayName } from "@/lib/surahs";
import { cn } from "@/lib/utils";

/** Sidebar: instant-filter list of the 114 surahs. */
export function SurahQuickList() {
  const { t, locale } = useApp();
  const [filter, setFilter] = useState("");
  const params = useParams<{ surah?: string; n?: string }>();
  const current = Number(params.surah ?? params.n ?? 0);
  const list = useMemo(() => (filter.trim() ? matchSurahs(filter, 114) : SURAHS), [filter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-line">
      <div className="px-4 pt-4 pb-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t.home.filterSurahs}
          aria-label={t.home.filterSurahs}
          className="h-9 w-full rounded-lg border border-line bg-surface-2/60 px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-line-gold"
        />
      </div>
      <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {list.map((s) => (
          <li key={s.number}>
            <Link
              href={`/sourate/${s.number}`}
              prefetch={false}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors",
                current === s.number ? "bg-accent-soft text-ink" : "text-ink-soft hover:bg-surface-2",
              )}
            >
              <span className="w-7 text-center text-[11px] tabular-nums text-muted">{num(s.number, locale)}</span>
              <span className="flex-1 truncate text-[12.5px] text-muted">{surahDisplayName(s, locale)}</span>
              <span className="font-display text-[15px] text-ink" lang="ar">{s.nameArabic}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
