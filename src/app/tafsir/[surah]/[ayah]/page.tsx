import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, CircleSlash, Layers } from "lucide-react";
import { Ornament, PatternLayer } from "@/components/brand/rosette";
import { ReaderActions, ReaderEffects } from "@/components/reader/actions";
import { attribution } from "@/lib/attribution";
import { FontSizeControl } from "@/components/reader/font-size-control";
import { NotesPanel } from "@/components/reader/notes-panel";
import { QuranVerses } from "@/components/reader/quran-verse";
import { SourceInfo } from "@/components/reader/source-info";
import { VersePicker } from "@/components/reader/verse-picker";
import { fmt, num } from "@/i18n/dictionaries";
import { adjacentVerses, parseSource, parseVerseParams } from "@/lib/params";
import { getI18n } from "@/lib/prefs.server";
import { getAvailability, getAyah, getAyahRange, getEntry, getSources } from "@/lib/queries";
import { compareHref, tafsirHref } from "@/lib/reference";
import { getSurah, surahDisplayName } from "@/lib/surahs";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ surah: string; ayah: string }>; searchParams: Promise<{ source?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const v = parseVerseParams(await params);
  if (!v) return {};
  const slug = parseSource((await searchParams).source);
  const [ayah, sources] = await Promise.all([getAyah(v.surah, v.ayah), getSources()]);
  const src = sources.find((s) => s.slug === slug);
  const title = `${v.meta.nameArabic} ${v.ayah}${src ? ` — ${src.titleArabic}` : ""}`;
  return {
    title,
    description: ayah?.textSimple.slice(0, 180),
    alternates: { canonical: tafsirHref(v.surah, v.ayah, src?.slug) },
    openGraph: { title, description: ayah?.textSimple.slice(0, 180) },
  };
}

export default async function TafsirPage({ params, searchParams }: Props) {
  const v = parseVerseParams(await params);
  if (!v) notFound();
  const { surah, ayah, meta } = v;
  const requested = parseSource((await searchParams).source);
  const [{ t, locale, prefs }, sources, availability, verse] = await Promise.all([
    getI18n(),
    getSources(),
    getAvailability(surah, ayah),
    getAyah(surah, ayah),
  ]);
  if (!verse) notFound();

  // Requested source → preferred → first source that covers this verse.
  const bySlug = (s?: string) => sources.find((x) => x.slug === s);
  const source = bySlug(requested) ?? bySlug(prefs.preferred) ?? sources.find((s) => availability.has(s.id)) ?? sources[0];
  const entry = source ? await getEntry(source.id, surah, ayah) : null;
  const isRange = !!entry && entry.ayahEnd > entry.ayahStart;
  const verses = isRange ? await getAyahRange(surah, entry.ayahStart, entry.ayahEnd) : [{ numberInSurah: ayah, textArabic: verse.textArabic }];

  const { prev, next } = adjacentVerses(surah, ayah);
  const q = source ? `?source=${source.slug}` : "";
  const prevHref = prev ? `/tafsir/${prev.surah}/${prev.ayah}${q}` : null;
  const nextHref = next ? `/tafsir/${next.surah}/${next.ayah}${q}` : null;
  const PrevIcon = locale === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = locale === "ar" ? ChevronLeft : ChevronRight;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const copyPayload =
    entry && source
      ? `${entry.contentArabic}\n\n${attribution({
          title: source.titleArabic, author: source.authorArabic, surahName: meta.nameArabic, surah,
          from: entry.ayahStart, to: entry.ayahEnd, provider: source.sourceName, url: `${siteUrl}${tafsirHref(surah, ayah, source.slug)}`,
        })}`
      : null;
  const otherSources = sources.filter((s) => s.id !== source?.id).slice(0, 1).map((s) => s.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <ReaderEffects surah={surah} ayah={ayah} source={source?.slug ?? null} prevHref={prevHref} nextHref={nextHref} />

      {/* ───── Header ───── */}
      <header className="flex flex-col gap-3 pt-6 pb-5 sm:flex-row sm:flex-wrap sm:items-center sm:pt-8">
        <div className="min-w-0 flex-1">
          <Link href={`/sourate/${surah}`} className="text-xs font-medium text-gold-ink hover:underline">
            {t.reader.surah} {num(surah, locale)} · {surahDisplayName(meta, locale)}
          </Link>
          <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-3xl text-primary sm:text-4xl dark:text-ink" lang="ar">{meta.nameArabic}</span>
            <span className="text-sm whitespace-nowrap text-muted">{fmt(t.reader.verseOf, { a: num(ayah, locale), n: num(meta.versesCount, locale) })}</span>
          </h1>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <FontSizeControl />
          <VersePicker surah={surah} ayah={ayah} query={q} />
          <nav aria-label={t.reader.ayah} className="flex items-center rounded-xl border border-line-strong bg-surface/70 p-0.5">
            {prevHref ? (
              <Link href={prevHref} scroll={false} className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-surface-2" aria-label={t.reader.prevAyah} title={t.reader.prevAyah}>
                <PrevIcon className="size-5" />
              </Link>
            ) : <span className="size-9" />}
            {nextHref ? (
              <Link href={nextHref} scroll={false} className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-surface-2" aria-label={t.reader.nextAyah} title={t.reader.nextAyah}>
                <NextIcon className="size-5" />
              </Link>
            ) : <span className="size-9" />}
          </nav>
        </div>
      </header>

      {/* ───── Quran zone ───── */}
      <section aria-label={`${meta.nameArabic} ${ayah}`} className="hairline relative isolate overflow-hidden rounded-[1.75rem] bg-surface px-5 py-9 shadow-lift sm:px-12 sm:py-12">
        <PatternLayer className="opacity-70" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40" style={{ background: "var(--glow)" }} />
        <QuranVerses surah={surah} verses={verses} current={ayah} />
        <p className="mt-6 text-center text-[11px] text-muted">
          <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer" className="hover:text-accent">{t.reader.quranSource}</a>
        </p>
      </section>

      {/* ───── Source tabs (all breakpoints; sticky under the top bar) ───── */}
      <nav aria-label={t.reader.tafsirs} className="glass sticky top-16 z-30 -mx-4 mt-6 border-y border-line px-4 py-2 sm:mx-0 sm:rounded-2xl sm:border lg:top-[72px]">
        <ul className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {sources.map((s) => {
            const has = availability.has(s.id);
            const active = s.id === source?.id;
            return (
              <li key={s.slug} className="shrink-0">
                <Link
                  href={tafsirHref(surah, ayah, s.slug)}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  title={has ? t.reader.available : t.reader.unavailable}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-xl px-3.5 font-display text-[15px] transition",
                    active ? "bg-primary text-primary-ink shadow-soft" : "text-ink-soft hover:bg-surface-2",
                    !has && !active && "text-muted/70",
                  )}
                >
                  <span lang="ar">{s.titleArabic}</span>
                  {!has && <CircleSlash className="size-3.5 opacity-70" aria-label={t.reader.unavailable} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ───── Tafsir zone ───── */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article aria-labelledby="tafsir-title" className="min-w-0">
          {source && (
            <header className="mb-5">
              <h2 id="tafsir-title" className="font-display text-2xl text-primary dark:text-ink" lang="ar" dir="rtl">{source.titleArabic}</h2>
              <p className="mt-1 text-sm text-muted" lang="ar" dir="rtl">{source.authorArabic}</p>
              {isRange && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line-gold bg-gold-soft px-3 py-1 text-xs text-gold-ink">
                  <Layers className="size-3.5" />
                  {fmt(t.reader.rangeNotice, { a: num(entry.ayahStart, locale), b: num(entry.ayahEnd, locale) })}
                </p>
              )}
            </header>
          )}

          {entry ? (
            <div
              dir="rtl"
              lang="ar"
              className="tafsir-prose mx-auto"
              style={{ maxWidth: "var(--reader-width)" }}
              // contentHtml is sanitised with a strict allow-list at import time (src/lib/sanitize.ts).
              dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
            />
          ) : (
            <div role="status" className="rounded-2xl border border-dashed border-line-strong bg-surface-2/40 p-8 text-center">
              <CircleSlash className="mx-auto mb-3 size-6 text-muted" />
              <p className="text-ink-soft">{t.reader.missing}</p>
              <p className="mt-1 text-xs text-muted">{t.reader.missingHint}</p>
            </div>
          )}

          <Ornament className="my-8" />

          <div className="mb-8 flex flex-col gap-5">
            <ReaderActions
              surah={surah}
              ayah={ayah}
              source={entry ? source?.slug ?? null : null}
              copyPayload={copyPayload}
              compareHref={compareHref(surah, ayah, [source?.slug, ...otherSources].filter(Boolean) as string[])}
            />
            <NotesPanel surah={surah} ayah={ayah} />
          </div>

          {/* Mobile/tablet: source info below the text */}
          <div className="lg:hidden">{source && <SourceInfo source={source} t={t} />}</div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-[150px] space-y-4">
            {source && <SourceInfo source={source} t={t} />}
            <Link href={`/sourate/${surah}`} className="block rounded-2xl border border-line bg-surface p-4 text-sm text-accent hover:border-line-gold">
              {t.reader.readSurah} — <span lang="ar" className="font-display text-base">{meta.nameArabic}</span>
            </Link>
          </div>
        </aside>
      </div>
      <AdjacentPrefetch prev={prev} next={next} q={q} />
    </div>
  );
}

/** Off-screen links so Next.js prefetches neighbouring verses. */
function AdjacentPrefetch({ prev, next, q }: { prev: { surah: number; ayah: number } | null; next: { surah: number; ayah: number } | null; q: string }) {
  const s = (x: { surah: number; ayah: number }) => getSurah(x.surah)!.nameArabic;
  return (
    <div className="sr-only" aria-hidden="true">
      {prev && <Link href={`/tafsir/${prev.surah}/${prev.ayah}${q}`} tabIndex={-1}>{s(prev)}</Link>}
      {next && <Link href={`/tafsir/${next.surah}/${next.ayah}${q}`} tabIndex={-1}>{s(next)}</Link>}
    </div>
  );
}
