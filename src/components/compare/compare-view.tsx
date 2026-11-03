"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bookmark, Check, Copy, Plus, Share2, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { copyText, shareLink, useFlash } from "@/components/reader/actions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { favoriteId, favoritesStore, toggleFavorite } from "@/lib/local-store";
import { compareHref } from "@/lib/reference";
import { cn } from "@/lib/utils";

export interface CompareColumn {
  slug: string;
  title: string;
  author: string;
  html: string | null;
  copy: string | null;
  rangeLabel: string | null;
}

export function CompareView({ surah, ayah, columns, available }: { surah: number; ayah: number; columns: CompareColumn[]; available: string[] }) {
  const { t, sources } = useApp();
  const router = useRouter();
  const [active, setActive] = useState(0);
  const selected = columns.map((c) => c.slug);
  const go = (next: string[]) => router.push(compareHref(surah, ayah, next), { scroll: false });
  const favorites = favoritesStore.useValue();
  const isFav = favorites.some((f) => f.id === favoriteId("comparison", surah, ayah, selected));
  const [shared, flashShared] = useFlash();

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="gold" disabled={selected.length >= 3} title={selected.length >= 3 ? t.compare.max : undefined}>
              <Plus /> {t.compare.add}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-2">
            <p className="px-2 pt-1 pb-2 text-xs text-muted">{t.compare.choose}</p>
            <ul>
              {sources.filter((s) => !selected.includes(s.slug)).map((s) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    onClick={() => go([...selected, s.slug])}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-start hover:bg-surface-2"
                  >
                    <span className="font-display text-base text-ink" lang="ar">{s.titleArabic}</span>
                    {!available.includes(s.slug) && <span className="text-[10px] text-muted">{t.reader.unavailable}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="ghost" onClick={async () => (await shareLink(location.href, document.title)) === "copied" && flashShared()}>
          {shared ? <Check className="text-accent" /> : <Share2 />} {shared ? t.reader.linkCopied : t.compare.shareCompare}
        </Button>
        <Button size="sm" variant="ghost" aria-pressed={isFav} onClick={() => toggleFavorite({ kind: "comparison", surah, ayah, sources: selected })}>
          <Bookmark className={cn(isFav && "fill-current text-gold")} /> {t.compare.saveCompare}
        </Button>
      </div>

      {/* Mobile / tablet tabs */}
      <div role="tablist" aria-label={t.compare.title} className="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 lg:hidden">
        {columns.map((c, i) => (
          <button
            key={c.slug}
            role="tab"
            id={`tab-${c.slug}`}
            aria-selected={i === active}
            aria-controls={`panel-${c.slug}`}
            onClick={() => setActive(i)}
            className={cn("h-11 flex-1 shrink-0 rounded-xl px-4 font-display text-[15px] whitespace-nowrap transition", i === active ? "bg-primary text-primary-ink" : "text-ink-soft")}
          >
            <span lang="ar">{c.title}</span>
          </button>
        ))}
      </div>

      {/* Columns */}
      <div className={cn("grid gap-4", columns.length === 2 && "lg:grid-cols-2", columns.length >= 3 && "lg:grid-cols-3")}>
        {columns.map((c, i) => (
          <Column key={c.slug} column={c} hiddenOnMobile={i !== active} canRemove={columns.length > 1} onRemove={() => go(selected.filter((s) => s !== c.slug))} />
        ))}
      </div>
    </div>
  );
}

function Column({ column: c, hiddenOnMobile, canRemove, onRemove }: { column: CompareColumn; hiddenOnMobile: boolean; canRemove: boolean; onRemove: () => void }) {
  const { t } = useApp();
  const [copied, flash] = useFlash();
  return (
    <section
      id={`panel-${c.slug}`}
      role="tabpanel"
      aria-labelledby={`tab-${c.slug}`}
      className={cn("hairline flex min-w-0 flex-col rounded-2xl bg-surface shadow-soft lg:flex", hiddenOnMobile ? "hidden" : "flex")}
    >
      <header className="glass sticky top-16 z-10 flex items-start gap-2 rounded-t-2xl border-b border-line px-5 py-4 lg:top-[72px]">
        <div className="min-w-0 flex-1" dir="rtl">
          <h2 className="font-display text-xl text-primary dark:text-ink" lang="ar">{c.title}</h2>
          <p className="truncate text-xs text-muted" lang="ar">{c.author}</p>
          {c.rangeLabel && <p className="mt-1 text-[11px] text-gold-ink">{c.rangeLabel}</p>}
        </div>
        {c.copy && (
          <button type="button" onClick={async () => (await copyText(c.copy!)) && flash()} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink" aria-label={t.reader.copy} title={t.reader.copy}>
            {copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}
          </button>
        )}
        {canRemove && (
          <button type="button" onClick={onRemove} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger" aria-label={`${t.compare.remove} ${c.title}`} title={t.compare.remove}>
            <X className="size-4" />
          </button>
        )}
      </header>
      <div className="px-5 py-5 sm:px-6">
        {c.html ? (
          // Sanitised at import time (allow-list) — see src/lib/sanitize.ts
          <div dir="rtl" lang="ar" className="tafsir-prose" dangerouslySetInnerHTML={{ __html: c.html }} />
        ) : (
          <p role="status" className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">{t.reader.missing}</p>
        )}
      </div>
    </section>
  );
}
