"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookmarkCheck } from "lucide-react";
import { useApp } from "@/components/providers";
import { num } from "@/i18n/dictionaries";
import { historyStore } from "@/lib/local-store";
import { getSurah } from "@/lib/surahs";

/** "Continue reading" — last surah / verse / tafsir from local history. */
export function ResumeCard() {
  const { t, locale, sources } = useApp();
  const history = historyStore.useValue();
  const last = history[0];
  const s = last ? getSurah(last.surah) : undefined;
  if (!last || !s) return null;
  const src = sources.find((x) => x.slug === last.source);
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;
  return (
    <Link
      href={`/tafsir/${last.surah}/${last.ayah}${last.source ? `?source=${last.source}` : ""}`}
      className="group hairline glass mx-auto mt-6 flex w-full max-w-xl items-center gap-4 rounded-2xl px-4 py-3 shadow-soft transition hover:shadow-lift"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-gold-soft text-gold-ink">
        <BookmarkCheck className="size-5" />
      </span>
      <span className="min-w-0 flex-1 text-start">
        <span className="block text-xs text-muted">{t.home.resume}</span>
        <span className="block truncate text-ink">
          <span className="font-display text-lg" lang="ar">{s.nameArabic}</span> · {t.reader.ayah} {num(last.ayah, locale)}
          {src && <span className="text-muted"> · <span lang="ar">{src.titleArabic}</span></span>}
        </span>
      </span>
      <Arrow className="size-5 text-accent transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}
