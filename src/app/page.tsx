import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Ornament, PatternLayer, Rosette } from "@/components/brand/rosette";
import { ResumeCard } from "@/components/home/resume-card";
import { SurahGrid } from "@/components/home/surah-grid";
import { LicenseBadge } from "@/components/license-badge";
import { SearchPanel } from "@/components/search/search-panel";
import { num } from "@/i18n/dictionaries";
import { getI18n } from "@/lib/prefs.server";
import { getCoverage, getSources } from "@/lib/queries";
import { TOTAL_AYAHS } from "@/lib/surahs";

export default async function HomePage() {
  const [{ t, locale }, sources, coverage] = await Promise.all([
    getI18n(),
    getSources().catch(() => []),
    getCoverage().catch(() => new Map<number, number>()),
  ]);
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="relative isolate z-10 border-b border-line">
        {/* Decorative layers are clipped here so the search dropdown can overflow the hero. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <PatternLayer />
          <div className="absolute inset-0" style={{ background: "var(--glow)" }} />
          <Rosette className="absolute start-1/2 top-1/2 w-[900px] max-w-none -translate-x-1/2 -translate-y-[42%] opacity-80 rtl:translate-x-1/2 sm:w-[1100px]" />
        </div>
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-24 sm:pb-24">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line-gold bg-surface/60 px-3.5 py-1 text-xs font-medium text-gold-ink backdrop-blur">
            <span className="size-1.5 rounded-full bg-accent" />
            {t.home.eyebrow}
          </p>
          <h1 className="font-display text-[2.6rem] leading-[1.25] font-bold text-primary sm:text-6xl dark:text-ink">
            {t.home.title}
          </h1>
          {locale !== "ar" && (
            <p lang="ar" dir="rtl" className="mt-3 font-display text-2xl text-gold-ink">
              تفسير القرآن الكريم
            </p>
          )}
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">{t.home.subtitle}</p>
          <div className="mt-9 w-full max-w-2xl">
            <SearchPanel variant="hero" />
          </div>
          <ResumeCard />
        </div>
      </section>

      {/* ───────────── Library ───────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-10" aria-labelledby="library-title">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="library-title" className="font-display text-2xl text-ink sm:text-3xl">{t.home.library}</h2>
          <Link href="/sources" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
            {t.nav.sources} <Arrow className="size-4" />
          </Link>
        </div>
        <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {sources.map((s) => {
            const covered = coverage.get(s.id) ?? 0;
            const pct = Math.floor((covered / TOTAL_AYAHS) * 1000) / 10;
            return (
              <li key={s.slug} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <Link
                  href={`/tafsir/2/255?source=${s.slug}`}
                  className="group hairline relative flex h-full flex-col overflow-hidden rounded-2xl bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <PatternLayer fade={false} className="opacity-50" />
                  <span className="relative font-display text-2xl text-primary dark:text-ink" lang="ar" dir="rtl">{s.titleArabic}</span>
                  <span className="relative mt-1 text-sm text-muted" lang="ar" dir="rtl">{s.authorArabic}</span>
                  <span className="relative mt-5 flex flex-wrap items-center gap-2">
                    <LicenseBadge status={s.licenseStatus} t={t} />
                  </span>
                  <span className="relative mt-4 block">
                    <span className="flex justify-between text-[11px] text-muted">
                      <span>{t.home.coverage}</span>
                      <span className="tabular-nums">{num(pct, locale)}%</span>
                    </span>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-gradient-to-r from-accent to-gold" style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <Ornament className="mx-auto mt-14 max-w-md px-6" />

      {/* ───────────── Surahs ───────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-10" aria-labelledby="surahs-title">
        <h2 id="surahs-title" className="mb-6 font-display text-2xl text-ink sm:text-3xl">{t.home.allSurahs}</h2>
        <SurahGrid />
      </section>
    </>
  );
}
