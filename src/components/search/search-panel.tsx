"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpenText, CornerDownLeft, History, Hash, Loader2, ScrollText, Search, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { Highlighted } from "./highlighted";
import { Kbd } from "@/components/ui/kbd";
import { fmt, num } from "@/i18n/dictionaries";
import type { Range } from "@/lib/highlight";
import { pushRecentSearch, recentSearchStore } from "@/lib/local-store";
import { parseReference } from "@/lib/reference";
import { matchSurahs, surahDisplayName } from "@/lib/surahs";
import { cn } from "@/lib/utils";

interface AyahHit { surah: number; ayah: number; text: string; ranges: Range[] }
interface TafsirHit { source: string; surah: number; ayahStart: number; ayahEnd: number; snippet: string; ranges: Range[]; prefix: boolean; suffix: boolean }

type Item =
  | { kind: "ref"; href: string; title: string; subtitle: string }
  | { kind: "invalid"; title: string }
  | { kind: "surah"; href: string; number: number; title: string; subtitle: string }
  | { kind: "ayah"; href: string; hit: AyahHit }
  | { kind: "tafsir"; href: string; hit: TafsirHit }
  | { kind: "recent"; q: string }
  | { kind: "all"; href: string; q: string };

const EXAMPLES = ["2:255", "الكهف 10", "يس", "الصبر", "Al-Mulk"];

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function SearchPanel({
  autoFocus,
  onNavigate,
  variant = "palette",
  initialQuery = "",
}: {
  autoFocus?: boolean;
  onNavigate?: () => void;
  variant?: "palette" | "hero";
  initialQuery?: string;
}) {
  const { t, locale, prefs, sources } = useApp();
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(variant === "palette");
  const [remote, setRemote] = useState<{ q: string; ayahs: AyahHit[]; tafsir: TafsirHit[] } | null>(null);
  const recent = recentSearchStore.useValue();
  const debounced = useDebounced(q.trim(), 160);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sourceTitle = useCallback((slug: string) => sources.find((s) => s.slug === slug)?.titleArabic ?? slug, [sources]);
  const preferred = prefs.preferred;

  const reference = useMemo(() => (q.trim() ? parseReference(q) : null), [q]);
  const surahHits = useMemo(() => (q.trim() && reference?.kind !== "ayah" ? matchSurahs(q, 6) : []), [q, reference]);

  // Remote full-text suggestions (skip when the query is a clear verse reference).
  const wantsRemote = debounced.length >= 2 && !/^[\d٠-٩\s:./-]+$/.test(debounced);
  useEffect(() => {
    if (!wantsRemote) return;
    const ctrl = new AbortController();
    fetch(`/api/search/suggest?q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setRemote({ q: debounced, ayahs: data.ayahs ?? [], tafsir: data.tafsir ?? [] }))
      // Network/offline failure: record an empty result so the spinner stops; no fake results.
      .catch(() => !ctrl.signal.aborted && setRemote({ q: debounced, ayahs: [], tafsir: [] }));
    return () => ctrl.abort();
  }, [debounced, wantsRemote]);
  const loading = wantsRemote && remote?.q !== debounced;

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    const query = q.trim();
    if (!query) {
      recent.forEach((r) => out.push({ kind: "recent", q: r }));
      return out;
    }
    if (reference?.kind === "ayah") {
      const s = reference.surah;
      out.push({
        kind: "ref",
        href: `/tafsir/${s.number}/${reference.ayah}?source=${preferred}`,
        title: `${s.nameArabic} · ${num(reference.ayah, locale)}`,
        subtitle: `${t.search.goToAyah} — ${surahDisplayName(s, locale)} ${s.number}:${reference.ayah}`,
      });
    } else if (reference?.kind === "invalid-ayah") {
      out.push({ kind: "invalid", title: fmt(t.search.invalidAyah, { n: reference.surah.versesCount }) });
    }
    for (const s of surahHits) {
      out.push({ kind: "surah", href: `/sourate/${s.number}`, number: s.number, title: s.nameArabic, subtitle: `${surahDisplayName(s, locale)} · ${num(s.versesCount, locale)} ${t.home.verses}` });
    }
    if (remote && remote.q === debounced) {
      remote.ayahs.forEach((hit) => out.push({ kind: "ayah", href: `/tafsir/${hit.surah}/${hit.ayah}?source=${preferred}`, hit }));
      remote.tafsir.forEach((hit) => out.push({ kind: "tafsir", href: `/tafsir/${hit.surah}/${hit.ayahStart}?source=${hit.source}`, hit }));
    }
    if (query.length >= 2) out.push({ kind: "all", href: `/recherche?q=${encodeURIComponent(query)}`, q: query });
    return out;
  }, [q, reference, surahHits, remote, debounced, recent, locale, t, preferred]);

  const go = useCallback(
    (item: Item) => {
      if (item.kind === "invalid") return;
      if (item.kind === "recent") {
        setQ(item.q);
        setActive(0);
        inputRef.current?.focus();
        return;
      }
      pushRecentSearch(q);
      onNavigate?.();
      setOpen(variant === "palette");
      router.push(item.href);
    },
    [q, router, onNavigate, variant],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) go(item);
    } else if (e.key === "Escape" && variant === "hero") {
      setOpen(false);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const showList = variant === "palette" || (open && (q.trim() || recent.length > 0));
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className={cn("relative", variant === "hero" && "w-full")}>
      <div
        className={cn(
          "flex items-center gap-3",
          variant === "palette" && "border-b border-line px-4",
          variant === "hero" &&
            "hairline glass rounded-2xl px-4 shadow-lift transition-shadow focus-within:shadow-[0_0_0_4px_var(--accent-soft),var(--shadow-2)] sm:px-5",
        )}
      >
        <Search className="size-5 shrink-0 text-gold-ink" aria-hidden="true" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => variant === "hero" && setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={t.search.placeholder}
          aria-label={t.search.placeholder}
          role="combobox"
          aria-expanded={!!showList}
          aria-controls={listId}
          aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted/80 focus-visible:outline-none",
            variant === "palette" ? "h-14 text-base" : "h-14 text-[1.05rem] sm:h-16 sm:text-lg",
          )}
        />
        {loading && <Loader2 className="size-4 animate-spin text-muted" aria-label={t.search.loading} />}
        {q && (
          <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-accent-soft hover:text-ink" aria-label={t.common.close}>
            <X className="size-4" />
          </button>
        )}
        {variant === "hero" && <Kbd className="hidden sm:inline-flex">⌘K</Kbd>}
      </div>

      {showList && (
        <div
          className={cn(
            variant === "hero" && "absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-lift",
          )}
        >
          <div id={listId} ref={listRef} role="listbox" className="scrollbar-thin max-h-[min(60vh,28rem)] overflow-y-auto p-2">
            {!q.trim() && !recent.length && (
              <div className="px-3 py-6">
                <p className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">{t.search.tryExamples}</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(ex); setActive(0); inputRef.current?.focus(); }} className="rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-soft transition hover:border-line-gold hover:bg-gold-soft">
                      <bdi>{ex}</bdi>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!q.trim() && recent.length > 0 && (
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="text-xs font-medium tracking-wide text-muted uppercase">{t.search.recent}</span>
                <button type="button" className="text-xs text-accent hover:underline" onMouseDown={(e) => e.preventDefault()} onClick={() => recentSearchStore.write(() => [])}>
                  {t.search.clearRecent}
                </button>
              </div>
            )}
            {items.map((item, i) => (
              <ItemRow key={i} item={item} index={i} id={`${listId}-${i}`} active={i === active} onHover={() => setActive(i)} onSelect={() => go(item)} sourceTitle={sourceTitle} arrow={<Arrow className="size-4" />} />
            ))}
            {q.trim().length >= 2 && !loading && remote?.q === debounced && items.filter((x) => x.kind !== "all").length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted">{t.search.noResults}</p>
            )}
          </div>
          <div className="hidden items-center justify-between border-t border-line px-4 py-2 text-[11px] text-muted sm:flex">
            <span>{t.search.hint}</span>
            <CornerDownLeft className="size-3.5" />
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item, index, id, active, onHover, onSelect, sourceTitle, arrow,
}: {
  item: Item; index: number; id: string; active: boolean; onHover: () => void; onSelect: () => void; sourceTitle: (s: string) => string; arrow: React.ReactNode;
}) {
  const { t, locale } = useApp();
  const base = cn(
    "group flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
    active ? "bg-accent-soft" : "hover:bg-surface-2",
  );
  const common = { id, role: "option" as const, "aria-selected": active, "data-index": index, onMouseEnter: onHover, onMouseDown: (e: React.MouseEvent) => e.preventDefault(), onClick: onSelect };
  const icon = (node: React.ReactNode) => <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-gold-ink">{node}</span>;

  switch (item.kind) {
    case "ref":
      return (
        <div {...common} className={cn(base, "border border-line-gold bg-gold-soft/60")}>
          {icon(<Hash className="size-4" />)}
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg text-ink">{item.title}</div>
            <div className="text-xs text-muted">{item.subtitle}</div>
          </div>
          <span className="self-center text-accent">{arrow}</span>
        </div>
      );
    case "invalid":
      return <div {...common} className="rounded-xl px-3 py-3 text-sm text-danger">{item.title}</div>;
    case "surah":
      return (
        <div {...common} className={base}>
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-ink">{num(item.number, locale)}</span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg leading-tight text-ink">{item.title}</div>
            <div className="text-xs text-muted">{item.subtitle}</div>
          </div>
          <span className="self-center text-muted opacity-0 group-aria-selected:opacity-100">{arrow}</span>
        </div>
      );
    case "ayah":
      return (
        <div {...common} className={base}>
          {icon(<BookOpenText className="size-4" />)}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-gold-ink">
              {t.search.ayahs} · <bdi>{item.hit.surah}:{item.hit.ayah}</bdi>
            </div>
            <p dir="rtl" lang="ar" className="line-clamp-2 font-quran text-lg leading-loose text-ink">
              <Highlighted text={item.hit.text} ranges={item.hit.ranges} />
            </p>
          </div>
        </div>
      );
    case "tafsir":
      return (
        <div {...common} className={base}>
          {icon(<ScrollText className="size-4" />)}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-gold-ink">
              <span lang="ar">{sourceTitle(item.hit.source)}</span> · <bdi>{item.hit.surah}:{item.hit.ayahStart}{item.hit.ayahEnd > item.hit.ayahStart ? `–${item.hit.ayahEnd}` : ""}</bdi>
            </div>
            <p dir="rtl" lang="ar" className="line-clamp-2 font-arabic text-[15px] leading-relaxed text-ink-soft">
              {item.hit.prefix && "… "}
              <Highlighted text={item.hit.snippet} ranges={item.hit.ranges} />
              {item.hit.suffix && " …"}
            </p>
          </div>
        </div>
      );
    case "recent":
      return (
        <div {...common} className={base}>
          {icon(<History className="size-4" />)}
          <span className="self-center text-ink-soft"><bdi>{item.q}</bdi></span>
        </div>
      );
    case "all":
      return (
        <div {...common} className={cn(base, "mt-1 border-t border-line pt-3")}>
          {icon(<Search className="size-4" />)}
          <span className="self-center text-sm text-accent">{fmt(t.search.searchAllFor, { q: item.q })}</span>
        </div>
      );
  }
}
