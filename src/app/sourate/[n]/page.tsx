import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AyahNumber, Rosette } from "@/components/brand/rosette";
import { FontSizeControl } from "@/components/reader/font-size-control";
import { Badge } from "@/components/ui/badge";
import { num } from "@/i18n/dictionaries";
import { BISMILLAH_UTHMANI, splitBismillah } from "@/lib/arabic";
import { getI18n } from "@/lib/prefs.server";
import { getSurahAyahs } from "@/lib/queries";
import { getSurah, surahDisplayName } from "@/lib/surahs";

type Props = { params: Promise<{ n: string }> };

function parse(n: string) {
  const v = Number(n);
  return Number.isInteger(v) ? getSurah(v) : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = parse((await params).n);
  if (!s) return {};
  return { title: `سورة ${s.nameArabic} — ${s.nameTransliterated}`, description: `${s.nameArabic} (${s.names.fr}) — ${s.versesCount} versets.` };
}

export default async function SurahPage({ params }: Props) {
  const s = parse((await params).n);
  if (!s) notFound();
  const [{ t, locale, prefs }, ayahs] = await Promise.all([getI18n(), getSurahAyahs(s.number)]);
  const prev = getSurah(s.number - 1);
  const next = getSurah(s.number + 1);
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;
  const PrevIcon = locale === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = locale === "ar" ? ChevronLeft : ChevronRight;
  const showBismillah = s.number !== 1 && s.number !== 9;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10">
      <header className="hairline relative isolate mt-6 overflow-hidden rounded-[1.75rem] bg-primary px-6 py-10 text-center text-primary-ink shadow-lift sm:mt-8 sm:py-14">
        <Rosette className="absolute start-1/2 top-1/2 -z-10 w-[640px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-60 rtl:translate-x-1/2" />
        <div className="flex items-center justify-center gap-2">
          <Badge className="border-white/25 text-white/80">{t.reader.surah} {num(s.number, locale)}</Badge>
          <Badge className="border-white/25 text-white/80">{t.home[s.revelationPlace]}</Badge>
          <Badge className="border-white/25 text-white/80">{num(s.versesCount, locale)} {t.home.verses}</Badge>
        </div>
        <h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl" lang="ar">{s.nameArabic}</h1>
        <p className="mt-2 text-white/75">{s.nameTransliterated}{locale !== "ar" && ` · ${surahDisplayName(s, locale)}`}</p>
        {showBismillah && <p lang="ar" dir="rtl" className="mt-6 font-quran text-2xl text-gold sm:text-3xl">{BISMILLAH_UTHMANI}</p>}
      </header>

      <div className="mt-6 flex items-center justify-between gap-3">
        <nav className="flex items-center gap-2" aria-label={t.nav.surahs}>
          {prev && (
            <Link href={`/sourate/${prev.number}`} className="flex h-10 items-center gap-1 rounded-xl border border-line-strong px-3 text-sm text-ink-soft hover:border-line-gold">
              <PrevIcon className="size-4" /> <span lang="ar" className="font-display">{prev.nameArabic}</span>
            </Link>
          )}
          {next && (
            <Link href={`/sourate/${next.number}`} className="flex h-10 items-center gap-1 rounded-xl border border-line-strong px-3 text-sm text-ink-soft hover:border-line-gold">
              <span lang="ar" className="font-display">{next.nameArabic}</span> <NextIcon className="size-4" />
            </Link>
          )}
        </nav>
        <FontSizeControl />
      </div>

      <ol className="mt-6 divide-y divide-line overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-soft">
        {ayahs.map((a) => {
          const { text } = splitBismillah(s.number, a.numberInSurah, a.textArabic);
          return (
            <li key={a.numberInSurah} id={`a${a.numberInSurah}`} className="group relative">
              <Link
                href={`/tafsir/${s.number}/${a.numberInSurah}?source=${prefs.preferred}`}
                prefetch={false}
                className="flex flex-col gap-3 px-5 py-6 transition-colors hover:bg-gold-soft/40 focus-visible:bg-gold-soft/40 sm:px-8"
              >
                <p dir="rtl" lang="ar" className="quran-text text-start !text-[calc(1.75rem*var(--reader-scale))] !leading-[2.1]">
                  {text}
                  <AyahNumber n={a.numberInSurah} />
                </p>
                <span className="flex items-center gap-1.5 self-end text-xs font-medium text-accent opacity-70 transition group-hover:opacity-100">
                  {t.reader.tafsirs} · <bdi>{s.number}:{a.numberInSurah}</bdi> <Arrow className="size-3.5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center text-[11px] text-muted">
        <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer" className="hover:text-accent">{t.reader.quranSource}</a>
      </p>
    </div>
  );
}
