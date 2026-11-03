import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { LicenseBadge } from "@/components/license-badge";
import { Badge } from "@/components/ui/badge";
import { num } from "@/i18n/dictionaries";
import { getI18n } from "@/lib/prefs.server";
import { getCoverage, getSources } from "@/lib/queries";
import { TOTAL_AYAHS } from "@/lib/surahs";

export const metadata: Metadata = { title: "المصادر والتراخيص — Sources" };

export default async function SourcesPage() {
  const [{ t, locale }, sources, coverage] = await Promise.all([getI18n(), getSources(), getCoverage()]);
  const fmtDate = (d: Date | null) => (d ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : locale, { dateStyle: "medium" }).format(d) : "—");
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl text-primary sm:text-4xl dark:text-ink">{t.sourcesPage.title}</h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted">{t.sourcesPage.intro}</p>

      <section className="mt-8 rounded-2xl border border-line-gold bg-gold-soft/50 p-5">
        <h2 className="font-display text-xl text-ink">{t.sourcesPage.quran}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Tanzil Quran Text (Uthmani, simple-clean) — Copyright © 2007-2026 Tanzil Project — Creative Commons Attribution 3.0.
          Texte reproduit à l&apos;identique (toute modification est interdite par la licence) ; une forme normalisée sert uniquement d&apos;index de recherche.
        </p>
        <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline">tanzil.net <ExternalLink className="size-3" /></a>
      </section>

      <ul className="mt-6 space-y-4">
        {sources.map((s) => {
          const covered = coverage.get(s.id) ?? 0;
          return (
            <li key={s.slug} className="hairline rounded-2xl bg-surface p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div dir="rtl" lang="ar">
                  <h2 className="font-display text-2xl text-primary dark:text-ink">{s.titleArabic}</h2>
                  <p className="text-sm text-muted">{s.authorArabic} — {s.description}</p>
                </div>
                <LicenseBadge status={s.licenseStatus} t={t} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-[11px] text-muted uppercase">{t.sourcesPage.coverage}</dt><dd className="tabular-nums text-ink">{num(covered, locale)} / {num(TOTAL_AYAHS, locale)}</dd></div>
                <div><dt className="text-[11px] text-muted uppercase">{t.reader.provider}</dt><dd><a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{s.sourceName}</a></dd></div>
                <div><dt className="text-[11px] text-muted uppercase">{t.sourcesPage.importedAt}</dt><dd className="text-ink">{fmtDate(s.importedAt)} <Badge className="ms-1">{s.version}</Badge></dd></div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted">{t.reader.license}: {s.license}. {s.licenseNotes}</p>
              {!s.edition && <p className="mt-1 text-xs text-muted italic">{t.reader.editionUnknown}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
