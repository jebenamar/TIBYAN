"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BookOpenText, CheckCircle2, Download, HardDrive, Loader2, RefreshCw, ScrollText, Search, Trash2 } from "lucide-react";
import { useOnline } from "@/components/layout/connectivity";
import { useApp } from "@/components/providers";
import { Highlighted } from "@/components/search/highlighted";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmt, num } from "@/i18n/dictionaries";
import {
  downloadSurah, getDownloadStatus, isOfflineSupported, removeSource, requestPersistence, searchOffline, storageEstimate,
  type DownloadStatus, type LocalHit,
} from "@/lib/offline-db";
import { SURAHS } from "@/lib/surahs";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

const fmtBytes = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

export function OfflineManager() {
  const { t, locale, sources } = useApp();
  const online = useOnline();
  const [status, setStatus] = useState<Map<string, DownloadStatus>>(new Map());
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [latest, setLatest] = useState<Map<string, string | null>>(new Map());
  const [progress, setProgress] = useState<Record<string, { done: number; total: number; error?: string }>>({});
  const aborters = useRef(new Map<string, AbortController>());
  // Server snapshot assumes support so SSR and hydration render the same tree.
  const supported = useSyncExternalStore(noopSubscribe, isOfflineSupported, () => true);

  const refresh = useCallback(async () => {
    if (!isOfflineSupported()) return;
    setStatus(await getDownloadStatus());
    setEstimate(await storageEstimate());
  }, []);

  useEffect(() => {
    refresh();
    if (!online) return;
    fetch("/api/offline/manifest")
      .then((r) => r.json())
      .then((m: { sources: Array<{ slug: string; importedAt: string | null }> }) => setLatest(new Map(m.sources.map((s) => [s.slug, s.importedAt]))))
      .catch(() => {});
  }, [refresh, online]);

  async function download(slug: string, surahs: number[]) {
    const ctrl = new AbortController();
    aborters.current.set(slug, ctrl);
    await requestPersistence();
    setProgress((p) => ({ ...p, [slug]: { done: 0, total: surahs.length } }));
    let done = 0;
    const queue = [...surahs];
    const worker = async () => {
      for (let s = queue.shift(); s !== undefined && !ctrl.signal.aborted; s = queue.shift()) {
        try {
          await downloadSurah(slug, s, ctrl.signal);
        } catch (err) {
          if (!ctrl.signal.aborted) setProgress((p) => ({ ...p, [slug]: { ...p[slug], error: String(err) } }));
          ctrl.abort();
          return;
        }
        done++;
        setProgress((p) => ({ ...p, [slug]: { ...p[slug], done } }));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    aborters.current.delete(slug);
    setProgress((p) => {
      const next = { ...p };
      if (!next[slug]?.error) delete next[slug];
      return next;
    });
    refresh();
  }

  if (!supported) return <p role="alert" className="text-danger">{t.common.error}: IndexedDB</p>;

  return (
    <div className="space-y-6">
      {estimate && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <HardDrive className="size-5 text-gold-ink" />
          <div className="flex-1">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">{t.offline.storage}</span>
              <span className="tabular-nums text-muted">{fmtBytes(estimate.usage)} {t.offline.of} {fmtBytes(estimate.quota)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (estimate.usage / Math.max(1, estimate.quota)) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {sources.map((s) => {
          const st = status.get(s.slug);
          const count = st?.surahs.length ?? 0;
          const prog = progress[s.slug];
          const outdated = !!st && latest.has(s.slug) && !st.importedAt.has(latest.get(s.slug) ?? null);
          return (
            <li key={s.slug} className="hairline rounded-2xl bg-surface p-4 shadow-soft sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl text-ink" lang="ar">{s.titleArabic}</h3>
                  <p className="text-xs text-muted">
                    {count === 114 ? <span className="inline-flex items-center gap-1 text-accent"><CheckCircle2 className="size-3.5" />{t.offline.downloaded}</span> : fmt(t.offline.surahsDownloaded, { n: num(count, locale), total: num(114, locale) })}
                    {st && ` · ${fmtBytes(st.bytes)}`}
                    {outdated && <span className="ms-2 text-gold-ink">· {t.offline.outdated}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {prog ? (
                    <Button size="sm" variant="outline" onClick={() => aborters.current.get(s.slug)?.abort()}>
                      <Loader2 className="animate-spin" /> {num(prog.done, locale)}/{num(prog.total, locale)} · {t.common.cancel}
                    </Button>
                  ) : (
                    <>
                      {outdated && online && (
                        <Button size="sm" variant="gold" onClick={() => download(s.slug, st!.surahs)}><RefreshCw /> {t.offline.update}</Button>
                      )}
                      {count < 114 && (
                        <>
                          <Button size="sm" variant="primary" disabled={!online} onClick={() => download(s.slug, SURAHS.map((x) => x.number).filter((n) => !st?.surahs.includes(n)))}>
                            <Download /> {t.offline.allSurahs}
                          </Button>
                          <SurahChooser disabled={!online} onConfirm={(list) => download(s.slug, list)} />
                        </>
                      )}
                      {count > 0 && (
                        <Button size="sm" variant="ghost" onClick={async () => { await removeSource(s.slug); refresh(); }} aria-label={`${t.offline.remove} ${s.titleArabic}`}>
                          <Trash2 /> {t.offline.remove}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {prog && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={prog.done} aria-valuemax={prog.total}>
                  <div className="h-full rounded-full bg-gradient-to-r from-accent to-gold transition-[width]" style={{ width: `${(prog.done / prog.total) * 100}%` }} />
                </div>
              )}
              {prog?.error && <p className="mt-2 text-xs text-danger">{t.common.error}: {prog.error}</p>}
            </li>
          );
        })}
      </ul>

      <LocalSearch />
    </div>
  );
}

function SurahChooser({ onConfirm, disabled }: { onConfirm: (s: number[]) => void; disabled: boolean }) {
  const { t } = useApp();
  const [picked, setPicked] = useState<number[]>([]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>{t.offline.selected}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <ul className="scrollbar-thin max-h-72 overflow-y-auto">
          {SURAHS.map((s) => (
            <li key={s.number}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={picked.includes(s.number)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.number] : p.filter((x) => x !== s.number)))} />
                <span className="w-6 text-xs tabular-nums text-muted">{s.number}</span>
                <span className="flex-1 font-display" lang="ar">{s.nameArabic}</span>
              </label>
            </li>
          ))}
        </ul>
        <Button size="sm" variant="primary" className="mt-2 w-full" disabled={!picked.length} onClick={() => { onConfirm([...picked].sort((a, b) => a - b)); setPicked([]); }}>
          <Download /> {t.offline.download} ({picked.length})
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function LocalSearch() {
  const { t, sources } = useApp();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<LocalHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section className="hairline rounded-2xl bg-surface p-5 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 font-display text-xl text-ink"><Search className="size-4 text-gold-ink" /> {t.offline.searchLocal}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setHits(await searchOffline(q));
          setBusy(false);
        }}
        className="flex gap-2"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-ink outline-none focus:border-accent" placeholder={t.search.shortPlaceholder} />
        <Button type="submit" variant="primary" disabled={q.trim().length < 2 || busy}>{busy ? <Loader2 className="animate-spin" /> : <Search />}</Button>
      </form>
      {hits && (
        <ul className="mt-4 space-y-2">
          {hits.length === 0 && <li className="py-6 text-center text-sm text-muted">{t.search.noResults}</li>}
          {hits.map((h, i) => (
            <li key={i}>
              <Link href={`/hors-ligne/lire?s=${h.surah}&a=${h.ayahStart}${h.slug ? `&source=${h.slug}` : ""}`} className="block rounded-xl border border-line p-3 hover:border-line-gold">
                <span className="mb-1 flex items-center gap-1.5 text-[11px] text-gold-ink">
                  {h.kind === "quran" ? <BookOpenText className="size-3.5" /> : <ScrollText className="size-3.5" />}
                  {h.slug && <span lang="ar">{sources.find((s) => s.slug === h.slug)?.titleArabic ?? h.slug}</span>}
                  <bdi>{h.surah}:{h.ayahStart}{h.ayahEnd > h.ayahStart ? `–${h.ayahEnd}` : ""}</bdi>
                </span>
                <p dir="rtl" lang="ar" className={cn("line-clamp-3", h.kind === "quran" ? "font-quran text-xl leading-loose" : "font-arabic leading-relaxed text-ink-soft")}>
                  <Highlighted text={h.text} ranges={h.ranges} />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
