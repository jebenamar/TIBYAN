"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CircleSlash, CloudOff, Layers } from "lucide-react";
import { AyahNumber } from "@/components/brand/rosette";
import { useApp } from "@/components/providers";
import { fmt, num } from "@/i18n/dictionaries";
import { splitBismillah } from "@/lib/arabic";
import { getOfflineEntry, getOfflineSources, getOfflineVerse, type OfflineSource } from "@/lib/offline-db";
import { adjacentVerses } from "@/lib/params";
import { getSurah } from "@/lib/surahs";
import { cn } from "@/lib/utils";

type State =
  | { status: "loading" }
  | { status: "no-verse" }
  | {
      status: "ready";
      verse: { textArabic: string; attribution: string };
      sources: OfflineSource[];
      source: OfflineSource | null;
      entry: { downloaded: boolean; entry?: { ayahStart: number; ayahEnd: number; html: string } | null };
    };

/**
 * Reads exclusively from IndexedDB. Never shows content that isn't actually
 * stored on the device. The URL is read from window.location because this page
 * may be served by the service worker in place of /tafsir/… while offline.
 */
export function OfflineReader() {
  const { t, locale } = useApp();
  const [loc, setLoc] = useState<{ s: number; a: number; source: string | null } | null>(null);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(location.search);
      const s = Number(p.get("s") ?? 1), a = Number(p.get("a") ?? 1);
      const meta = getSurah(s);
      setLoc(meta && a >= 1 && a <= meta.versesCount ? { s, a, source: p.get("source") } : { s: 1, a: 1, source: p.get("source") });
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  useEffect(() => {
    if (!loc) return;
    let cancelled = false;
    (async () => {
      setState({ status: "loading" });
      const [verse, sources] = await Promise.all([getOfflineVerse(loc.s, loc.a), getOfflineSources()]);
      if (cancelled) return;
      if (!verse) return setState({ status: "no-verse" });
      const source = sources.find((x) => x.slug === loc.source) ?? sources[0] ?? null;
      const entry = source ? await getOfflineEntry(source.slug, loc.s, loc.a) : { downloaded: false };
      if (!cancelled) setState({ status: "ready", verse, sources, source, entry });
    })();
    return () => { cancelled = true; };
  }, [loc]);

  if (!loc) return null;
  const meta = getSurah(loc.s)!;
  const { prev, next } = adjacentVerses(loc.s, loc.a);
  const go = (s: number, a: number, source?: string | null) => {
    const url = `/hors-ligne/lire?s=${s}&a=${a}${source ? `&source=${source}` : ""}`;
    history.pushState(null, "", url);
    setLoc({ s, a, source: source ?? null });
  };
  const current = state.status === "ready" ? state.source?.slug ?? null : loc.source;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-gold bg-gold-soft px-3 py-1 text-xs text-gold-ink">
        <CloudOff className="size-3.5" /> {t.offline.reader}
      </p>
      <header className="mb-5 flex items-center gap-3">
        <h1 className="flex-1">
          <span className="font-display text-3xl text-primary dark:text-ink" lang="ar">{meta.nameArabic}</span>{" "}
          <span className="text-sm text-muted">{fmt(t.reader.verseOf, { a: num(loc.a, locale), n: num(meta.versesCount, locale) })}</span>
        </h1>
        <div className="flex rounded-xl border border-line-strong p-0.5">
          <button type="button" disabled={!prev} onClick={() => prev && go(prev.surah, prev.ayah, current)} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30" aria-label={t.reader.prevAyah}>
            {locale === "ar" ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
          </button>
          <button type="button" disabled={!next} onClick={() => next && go(next.surah, next.ayah, current)} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30" aria-label={t.reader.nextAyah}>
            {locale === "ar" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        </div>
      </header>

      {state.status === "loading" && <div className="skeleton h-48" />}
      {state.status === "no-verse" && (
        <div role="status" className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-muted">
          <CircleSlash className="mx-auto mb-3 size-6" />
          {t.offline.notDownloaded}
          <p className="mt-4"><Link href="/hors-ligne" className="text-accent hover:underline">{t.offline.title}</Link></p>
        </div>
      )}
      {state.status === "ready" && (
        <>
          <section className="hairline rounded-[1.5rem] bg-surface px-5 py-8 text-center shadow-lift sm:px-10">
            {(() => {
              const { bismillah, text } = splitBismillah(loc.s, loc.a, state.verse.textArabic);
              return (
                <p dir="rtl" lang="ar" className="quran-text">
                  {bismillah && <span className="mb-4 block text-[0.78em] text-gold-ink">{bismillah}</span>}
                  {text}<AyahNumber n={loc.a} />
                </p>
              );
            })()}
            <p className="mt-4 text-[11px] text-muted">{state.verse.attribution}</p>
          </section>

          <nav className="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto" aria-label={t.reader.tafsirs}>
            {state.sources.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => go(loc.s, loc.a, s.slug)}
                className={cn("h-10 shrink-0 rounded-xl px-3.5 font-display text-[15px]", s.slug === state.source?.slug ? "bg-primary text-primary-ink" : "text-ink-soft hover:bg-surface-2")}
              >
                <span lang="ar">{s.titleArabic}</span>
              </button>
            ))}
          </nav>

          <article className="mt-5">
            {state.source && <p className="mb-3 text-sm text-muted" lang="ar" dir="rtl">{state.source.titleArabic} — {state.source.authorArabic} · {state.source.sourceName}</p>}
            {state.entry.entry ? (
              <>
                {state.entry.entry.ayahEnd > state.entry.entry.ayahStart && (
                  <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line-gold bg-gold-soft px-3 py-1 text-xs text-gold-ink">
                    <Layers className="size-3.5" />{fmt(t.reader.rangeNotice, { a: num(state.entry.entry.ayahStart, locale), b: num(state.entry.entry.ayahEnd, locale) })}
                  </p>
                )}
                {/* Stored HTML was sanitised server-side at import time. */}
                <div dir="rtl" lang="ar" className="tafsir-prose" dangerouslySetInnerHTML={{ __html: state.entry.entry.html }} />
              </>
            ) : (
              <p role="status" className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
                {state.entry.downloaded ? t.reader.missing : t.offline.notDownloaded}
              </p>
            )}
          </article>
        </>
      )}
    </div>
  );
}
