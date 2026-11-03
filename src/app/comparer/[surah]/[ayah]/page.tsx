import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { PatternLayer } from "@/components/brand/rosette";
import { CompareView, type CompareColumn } from "@/components/compare/compare-view";
import { FontSizeControl } from "@/components/reader/font-size-control";
import { QuranVerses } from "@/components/reader/quran-verse";
import { VersePicker } from "@/components/reader/verse-picker";
import { fmt, num } from "@/i18n/dictionaries";
import { attribution } from "@/lib/attribution";
import { adjacentVerses, parseSourceList, parseVerseParams } from "@/lib/params";
import { getI18n } from "@/lib/prefs.server";
import { getAvailability, getAyah, getEntry, getSources } from "@/lib/queries";
import { compareHref, tafsirHref } from "@/lib/reference";
import { surahDisplayName } from "@/lib/surahs";

type Props = { params: Promise<{ surah: string; ayah: string }>; searchParams: Promise<{ sources?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = parseVerseParams(await params);
  return v ? { title: `مقارنة التفاسير — ${v.meta.nameArabic} ${v.ayah}` } : {};
}

export default async function ComparePage({ params, searchParams }: Props) {
  const v = parseVerseParams(await params);
  if (!v) notFound();
  const { surah, ayah, meta } = v;
  const [{ t, locale, prefs }, sources, availability, verse] = await Promise.all([getI18n(), getSources(), getAvailability(surah, ayah), getAyah(surah, ayah)]);
  if (!verse) notFound();

  let selected = parseSourceList((await searchParams).sources).filter((s) => sources.some((x) => x.slug === s));
  if (selected.length === 0) {
    const fallback = [prefs.preferred, ...sources.map((s) => s.slug)];
    selected = [...new Set(fallback)].filter((s) => sources.some((x) => x.slug === s)).slice(0, 2);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const columns: CompareColumn[] = await Promise.all(
    selected.map(async (slug) => {
      const src = sources.find((s) => s.slug === slug)!;
      const entry = await getEntry(src.id, surah, ayah);
      return {
        slug,
        title: src.titleArabic,
        author: src.authorArabic,
        html: entry?.contentHtml ?? null,
        copy: entry
          ? `${entry.contentArabic}\n\n${attribution({ title: src.titleArabic, author: src.authorArabic, surahName: meta.nameArabic, surah, from: entry.ayahStart, to: entry.ayahEnd, provider: src.sourceName, url: `${siteUrl}${tafsirHref(surah, ayah, slug)}` })}`
          : null,
        rangeLabel: entry && entry.ayahEnd > entry.ayahStart ? fmt(t.reader.rangeNotice, { a: num(entry.ayahStart, locale), b: num(entry.ayahEnd, locale) }) : null,
      };
    }),
  );

  const { prev, next } = adjacentVerses(surah, ayah);
  const PrevIcon = locale === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = locale === "ar" ? ChevronLeft : ChevronRight;
  const available = sources.filter((s) => availability.has(s.id)).map((s) => s.slug);
  const qs = `?sources=${selected.join(",")}`;

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
      <header className="flex flex-col gap-3 pt-6 pb-5 sm:flex-row sm:flex-wrap sm:items-center sm:pt-8">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-gold-ink"><Scale className="size-3.5" /> {t.compare.title}</p>
          <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link href={tafsirHref(surah, ayah, selected[0])} className="font-display text-3xl text-primary hover:text-accent sm:text-4xl dark:text-ink" lang="ar">{meta.nameArabic}</Link>
            <span className="text-sm whitespace-nowrap text-muted">{surahDisplayName(meta, locale)} · {fmt(t.reader.verseOf, { a: num(ayah, locale), n: num(meta.versesCount, locale) })}</span>
          </h1>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <FontSizeControl />
          <VersePicker surah={surah} ayah={ayah} basePath="/comparer" query={qs} />
          <nav className="flex items-center rounded-xl border border-line-strong bg-surface/70 p-0.5" aria-label={t.reader.ayah}>
            {prev ? <Link href={compareHref(prev.surah, prev.ayah, selected)} scroll={false} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2" aria-label={t.reader.prevAyah}><PrevIcon className="size-5" /></Link> : <span className="size-9" />}
            {next ? <Link href={compareHref(next.surah, next.ayah, selected)} scroll={false} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2" aria-label={t.reader.nextAyah}><NextIcon className="size-5" /></Link> : <span className="size-9" />}
          </nav>
        </div>
      </header>

      <section className="hairline relative isolate mb-4 overflow-hidden rounded-2xl bg-surface px-5 py-6 shadow-soft sm:px-10">
        <PatternLayer className="opacity-60" />
        <div className="[&_.quran-text]:!text-[calc(clamp(1.5rem,1.1rem+1.4vw,2.1rem)*var(--reader-scale))]">
          <QuranVerses surah={surah} verses={[{ numberInSurah: ayah, textArabic: verse.textArabic }]} current={ayah} />
        </div>
      </section>
      <p className="mb-6 text-center text-xs text-muted">{t.compare.disclaimer}</p>

      <CompareView surah={surah} ayah={ayah} columns={columns} available={available} />
    </div>
  );
}
