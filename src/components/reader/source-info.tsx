import { ExternalLink, Info } from "lucide-react";
import { LicenseBadge } from "@/components/license-badge";
import type { Dictionary } from "@/i18n/dictionaries";
import type { TafsirSourceRow } from "@/lib/queries";

export function SourceInfo({ source, t }: { source: TafsirSourceRow; t: Dictionary }) {
  const rows: Array<[string, React.ReactNode]> = [
    [t.reader.work, <span key="w" lang="ar" dir="rtl">{source.titleArabic}{source.description ? ` — ${source.description}` : ""}</span>],
    [t.reader.author, <span key="a" lang="ar" dir="rtl">{source.authorArabic}</span>],
    [t.reader.edition, source.edition ?? <span key="e" className="text-muted italic">{t.reader.editionUnknown}</span>],
    [t.reader.provider, (
      <a key="p" href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
        {source.sourceName} <ExternalLink className="size-3" />
      </a>
    )],
    [t.reader.license, <span key="l" className="flex flex-col gap-1.5"><LicenseBadge status={source.licenseStatus} t={t} /><span className="text-xs leading-relaxed text-muted">{source.licenseNotes}</span></span>],
  ];
  return (
    <section aria-labelledby={`src-${source.slug}`} className="rounded-2xl border border-line bg-surface p-5">
      <h3 id={`src-${source.slug}`} className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <Info className="size-4 text-gold-ink" /> {t.reader.sourceInfo}
      </h3>
      <dl className="space-y-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{k}</dt>
            <dd className="mt-0.5 text-ink-soft">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
