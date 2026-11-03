"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import { useApp } from "@/components/providers";
import { num } from "@/i18n/dictionaries";
import { matchSurahs, SURAHS, surahDisplayName, type SurahMeta } from "@/lib/surahs";
import { cn } from "@/lib/utils";

type Filter = "all" | "makkah" | "madinah";

export function SurahGrid({ withFilter = true }: { withFilter?: boolean }) {
  const { t, locale } = useApp();
  const [q, setQ] = useState("");
  const [place, setPlace] = useState<Filter>("all");
  const reduce = useReducedMotion();

  const list = useMemo(() => {
    const base = q.trim() ? matchSurahs(q, 114) : SURAHS;
    return place === "all" ? base : base.filter((s) => s.revelationPlace === place);
  }, [q, place]);

  return (
    <div>
      {withFilter && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.home.filterSurahs}
              aria-label={t.home.filterSurahs}
              className="h-12 w-full rounded-xl border border-line-strong bg-surface ps-10 pe-4 text-ink outline-none transition placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_4px_var(--accent-soft)]"
            />
          </label>
          <div role="radiogroup" aria-label={t.home.allSurahs} className="flex rounded-xl border border-line-strong bg-surface p-1">
            {(["all", "makkah", "madinah"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={place === f}
                onClick={() => setPlace(f)}
                className={cn("h-10 rounded-lg px-4 text-sm transition", place === f ? "bg-primary text-primary-ink shadow-soft" : "text-muted hover:text-ink")}
              >
                {f === "all" ? t.search.scopeAll : t.home[f]}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {list.map((s, i) => (
          <motion.li
            key={s.number}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -40px 0px" }}
            transition={{ duration: 0.4, delay: Math.min(i % 12, 8) * 0.025, ease: [0.16, 1, 0.3, 1] }}
          >
            <SurahCard s={s} label={surahDisplayName(s, locale)} verses={`${num(s.versesCount, locale)} ${t.home.verses}`} place={t.home[s.revelationPlace]} n={num(s.number, locale)} />
          </motion.li>
        ))}
      </ul>
      {list.length === 0 && <p className="py-16 text-center text-muted">{t.search.noResults}</p>}
    </div>
  );
}

function SurahCard({ s, label, verses, place, n }: { s: SurahMeta; label: string; verses: string; place: string; n: string }) {
  return (
    <Link
      href={`/sourate/${s.number}`}
      className="group hairline relative flex items-center gap-4 overflow-hidden rounded-2xl bg-surface p-4 shadow-soft transition duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className="pointer-events-none absolute -end-10 -top-10 size-28 rounded-full bg-[radial-gradient(circle,var(--gold-soft),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <span className="relative grid size-12 shrink-0 place-items-center">
        <svg viewBox="0 0 48 48" className="absolute inset-0 text-line-gold transition-transform duration-700 ease-out-expo group-hover:rotate-45" aria-hidden="true">
          <rect x="10" y="10" width="28" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="10" y="10" width="28" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(45 24 24)" />
        </svg>
        <span className="relative text-sm font-semibold tabular-nums text-gold-ink">{n}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {place} · {verses}
        </span>
      </span>
      <span className="font-display text-2xl text-primary transition-colors group-hover:text-accent dark:text-ink" lang="ar" dir="rtl">
        {s.nameArabic}
      </span>
    </Link>
  );
}
