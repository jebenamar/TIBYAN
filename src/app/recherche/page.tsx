import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenText, Hash, ScrollText, Search } from "lucide-react";
import { Highlighted } from "@/components/search/highlighted";
import { RecordSearch } from "@/components/search/record-search";
import { Button } from "@/components/ui/button";
import { fmt, num, type Dictionary } from "@/i18n/dictionaries";
import { log } from "@/lib/log";
import { getI18n } from "@/lib/prefs.server";
import { getSources } from "@/lib/queries";
import { parseReference } from "@/lib/reference";
import { searchParamsSchema, searchQuran, searchTafsir, timed, type QuranHit, type TafsirHit } from "@/lib/search";
import { getSurah, SURAHS, surahDisplayName } from "@/lib/surahs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "البحث — Recherche", robots: { index: false } };

const PAGE_SIZE = 20;
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : (raw[k] as string | undefined));
  const parsed = searchParamsSchema.safeParse({ q: one("q") ?? "", scope: one("scope"), exact: one("exact"), surah: one("surah") || undefined, source: one("source") || undefined, page: one("page") });
  const [{ t, locale, prefs }, sources] = await Promise.all([getI18n(), getSources()]);

  let quran: { hits: QuranHit[]; hasMore: boolean } = { hits: [], hasMore: false };
  let tafsir: { hits: TafsirHit[]; hasMore: boolean } = { hits: [], hasMore: false };
  let failed = false;
  const p = parsed.success ? parsed.data : null;
  const reference = p ? parseReference(p.q) : null;

  if (p) {
    const offset = (p.page - 1) * PAGE_SIZE;
    try {
      [quran, tafsir] = await timed("search.page", { q: p.q, scope: p.scope }, () =>
        Promise.all([
          p.scope !== "tafsir" && !p.source ? searchQuran({ q: p.q, exact: p.exact, surah: p.surah, limit: p.scope === "quran" ? PAGE_SIZE : 8, offset: p.scope === "quran" ? offset : 0 }) : Promise.resolve({ hits: [], hasMore: false }),
          p.scope !== "quran" ? searchTafsir({ q: p.q, exact: p.exact, surah: p.surah, source: p.source, limit: PAGE_SIZE, offset }) : Promise.resolve({ hits: [], hasMore: false }),
        ]),
      );
    } catch (err) {
      failed = true;
      log.error("search.page_failed", { q: p.q, err });
    }
  }

  const href = (patch: Record<string, string | number | undefined>) => {
    const merged: Record<string, string> = {};
    const base = { q: p?.q, scope: p?.scope, exact: p?.exact ? "1" : undefined, surah: p?.surah, source: p?.source, page: p?.page, ...patch };
    for (const [k, v] of Object.entries(base)) if (v !== undefined && v !== "" && !(k === "page" && Number(v) === 1) && !(k === "scope" && v === "all")) merged[k] = String(v);
    return `/recherche?${new URLSearchParams(merged)}`;
  };
  const sourceTitle = (slug: string) => sources.find((s) => s.slug === slug)?.titleArabic ?? slug;
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
      {p && <RecordSearch q={p.q} />}
      <h1 className="font-display text-3xl text-primary sm:text-4xl dark:text-ink">{p ? fmt(t.search.resultsFor, { q: p.q }) : t.search.results}</h1>

      {/* Filters (plain GET form → works without JavaScript) */}
      <form action="/recherche" className="hairline mt-6 grid gap-3 rounded-2xl bg-surface p-4 shadow-soft sm:grid-cols-[1fr_auto] sm:p-5" role="search">
        <label className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-gold-ink" />
          <input name="q" defaultValue={p?.q ?? one("q") ?? ""} required maxLength={200} placeholder={t.search.placeholder} aria-label={t.search.placeholder} className="h-12 w-full rounded-xl border border-line-strong bg-surface ps-10 pe-4 text-ink outline-none focus:border-accent" />
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Select name="scope" label={t.search.scope} value={p?.scope ?? "all"} options={[["all", t.search.scopeAll], ["quran", t.search.scopeQuran], ["tafsir", t.search.scopeTafsir]]} />
          <Select name="surah" label={t.reader.surah} value={p?.surah ? String(p.surah) : ""} options={[["", t.search.allSurahs], ...SURAHS.map((s) => [String(s.number), `${s.number}. ${s.nameArabic}`] as [string, string])]} />
          <Select name="source" label={t.reader.source} value={p?.source ?? ""} options={[["", t.search.allSources], ...sources.map((s) => [s.slug, s.titleArabic] as [string, string])]} />
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-3 text-sm text-ink-soft">
            <input type="checkbox" name="exact" value="1" defaultChecked={p?.exact} className="size-4 accent-[var(--accent)]" />
            {t.search.exact}
          </label>
          <Button type="submit" variant="primary" size="sm" className="ms-auto h-10">{t.nav.search}</Button>
        </div>
      </form>

      {failed && <p role="alert" className="mt-6 rounded-xl border border-danger/40 bg-danger/10 p-4 text-danger">{t.common.error}</p>}

      {reference && (reference.kind === "ayah" || reference.kind === "surah") && (
        <Link
          href={reference.kind === "ayah" ? `/tafsir/${reference.surah.number}/${reference.ayah}?source=${prefs.preferred}` : `/sourate/${reference.surah.number}`}
          className="mt-6 flex items-center gap-4 rounded-2xl border border-line-gold bg-gold-soft p-4 transition hover:shadow-soft"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-ink"><Hash className="size-5" /></span>
          <span className="flex-1">
            <span className="block text-xs text-gold-ink">{reference.kind === "ayah" ? t.search.goToAyah : t.search.goToSurah}</span>
            <span className="font-display text-xl text-ink" lang="ar">{reference.surah.nameArabic}{reference.kind === "ayah" && ` · ${num(reference.ayah, locale)}`}</span>
          </span>
          <Arrow className="size-5 text-accent" />
        </Link>
      )}

      {p && !failed && quran.hits.length === 0 && tafsir.hits.length === 0 && <p className="mt-10 text-center text-muted">{t.search.noResults}</p>}

      {quran.hits.length > 0 && (
        <section className="mt-10" aria-labelledby="r-quran">
          <SectionTitle id="r-quran" icon={<BookOpenText className="size-4" />} label={t.search.scopeQuran} />
          <ul className="space-y-3">
            {quran.hits.map((h) => (
              <li key={`${h.surah}:${h.ayah}`}>
                <Link href={`/tafsir/${h.surah}/${h.ayah}?source=${prefs.preferred}`} className="block rounded-2xl border border-line bg-surface p-5 transition hover:border-line-gold hover:shadow-soft">
                  <span className="mb-1 block text-xs font-medium text-gold-ink">
                    <span lang="ar">{getSurah(h.surah)!.nameArabic}</span> · {surahDisplayName(getSurah(h.surah)!, locale)} · <bdi>{h.surah}:{h.ayah}</bdi>
                  </span>
                  <p dir="rtl" lang="ar" className="font-quran text-2xl leading-[2.1] text-ink"><Highlighted text={h.text} ranges={h.ranges} /></p>
                </Link>
              </li>
            ))}
          </ul>
          {p?.scope === "all" && quran.hasMore && (
            <Link href={href({ scope: "quran", page: 1 })} className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline">{t.search.more} <Arrow className="size-4" /></Link>
          )}
        </section>
      )}

      {tafsir.hits.length > 0 && (
        <section className="mt-10" aria-labelledby="r-tafsir">
          <SectionTitle id="r-tafsir" icon={<ScrollText className="size-4" />} label={t.search.scopeTafsir} />
          <ul className="space-y-3">
            {tafsir.hits.map((h, i) => (
              <li key={`${h.source}-${h.surah}-${h.ayahStart}-${i}`}>
                <Link href={`/tafsir/${h.surah}/${h.ayahStart}?source=${h.source}`} className="block rounded-2xl border border-line bg-surface p-5 transition hover:border-line-gold hover:shadow-soft">
                  <span className="mb-2 flex flex-wrap items-center gap-x-2 text-xs font-medium text-gold-ink">
                    <span lang="ar" className="font-display text-sm text-primary dark:text-ink">{sourceTitle(h.source)}</span>
                    <span>·</span>
                    <span lang="ar">{getSurah(h.surah)!.nameArabic}</span>
                    <bdi>{h.surah}:{h.ayahStart}{h.ayahEnd > h.ayahStart ? `–${h.ayahEnd}` : ""}</bdi>
                  </span>
                  <p dir="rtl" lang="ar" className="font-arabic text-[1.05rem] leading-loose text-ink-soft">
                    {h.prefix && "… "}<Highlighted text={h.snippet} ranges={h.ranges} />{h.suffix && " …"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p && (p.page > 1 || tafsir.hasMore || (p.scope === "quran" && quran.hasMore)) && (
        <Pagination t={t} prev={p.page > 1 ? href({ page: p.page - 1 }) : null} next={tafsir.hasMore || (p.scope === "quran" && quran.hasMore) ? href({ page: p.page + 1 }) : null} page={num(p.page, locale)} />
      )}
    </div>
  );
}

function SectionTitle({ id, icon, label }: { id: string; icon: React.ReactNode; label: string }) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
      <span className="grid size-7 place-items-center rounded-lg bg-gold-soft text-gold-ink">{icon}</span>
      {label}
    </h2>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: Array<[string, string]> }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={value} className={cn("h-10 max-w-[12rem] rounded-xl border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-accent")}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Pagination({ t, prev, next, page }: { t: Dictionary; prev: string | null; next: string | null; page: string }) {
  return (
    <nav className="mt-10 flex items-center justify-center gap-3" aria-label={t.search.results}>
      {prev ? <Button asChild size="sm"><Link href={prev}>{t.search.prev}</Link></Button> : <span />}
      <span className="text-sm tabular-nums text-muted">{page}</span>
      {next ? <Button asChild size="sm"><Link href={next}>{t.search.next}</Link></Button> : <span />}
    </nav>
  );
}
