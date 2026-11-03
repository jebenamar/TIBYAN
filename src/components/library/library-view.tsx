"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Clock, Columns3, Heart, NotebookPen, ScrollText, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { num } from "@/i18n/dictionaries";
import { favoritesStore, historyStore, notesStore, saveNote, toggleFavorite } from "@/lib/local-store";
import { compareHref, tafsirHref } from "@/lib/reference";
import { getSurah } from "@/lib/surahs";
import { cn } from "@/lib/utils";

type Tab = "favorites" | "notes" | "history";

export function LibraryView() {
  const { t, locale, sources } = useApp();
  const [tab, setTab] = useState<Tab>("favorites");
  const favorites = favoritesStore.useValue();
  const notes = Object.values(notesStore.useValue()).sort((a, b) => b.updatedAt - a.updatedAt);
  const history = historyStore.useValue();
  const title = (slug: string) => sources.find((s) => s.slug === slug)?.titleArabic ?? slug;
  const date = (ms: number) => new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : locale, { dateStyle: "medium", timeStyle: "short" }).format(ms);
  const verseLabel = (s: number, a: number) => (
    <>
      <span lang="ar" className="font-display text-lg text-ink">{getSurah(s)?.nameArabic}</span>{" "}
      <span className="text-sm text-muted">· {t.reader.ayah} {num(a, locale)}</span>
    </>
  );

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; count: number }> = [
    { id: "favorites", label: t.library.favorites, icon: <Heart className="size-4" />, count: favorites.length },
    { id: "notes", label: t.library.notes, icon: <NotebookPen className="size-4" />, count: notes.length },
    { id: "history", label: t.library.history, icon: <Clock className="size-4" />, count: history.length },
  ];

  return (
    <div>
      <div role="tablist" className="mb-6 flex gap-1 rounded-2xl border border-line bg-surface p-1">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={cn("flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm transition", tab === x.id ? "bg-primary text-primary-ink shadow-soft" : "text-ink-soft hover:bg-surface-2")}
          >
            {x.icon} {x.label} <span className="tabular-nums opacity-70">{num(x.count, locale)}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "favorites" && (
          <List empty={!favorites.length} emptyLabel={t.library.empty}>
            {favorites.map((f) => {
              const href = f.kind === "comparison" ? compareHref(f.surah, f.ayah, f.sources) : tafsirHref(f.surah, f.ayah, f.sources[0]);
              const Icon = f.kind === "comparison" ? Columns3 : f.kind === "explanation" ? ScrollText : BookOpen;
              const kind = f.kind === "comparison" ? t.library.comparison : f.kind === "explanation" ? t.library.explanation : t.library.verse;
              return (
                <Row key={f.id} href={href} icon={<Icon className="size-4" />} onRemove={() => toggleFavorite(f)} removeLabel={t.reader.unfavorite}>
                  <span className="block text-xs text-gold-ink">{kind}{f.sources.length > 0 && <> · <span lang="ar">{f.sources.map(title).join(" ⟷ ")}</span></>}</span>
                  {verseLabel(f.surah, f.ayah)}
                </Row>
              );
            })}
          </List>
        )}

        {tab === "notes" && (
          <List empty={!notes.length} emptyLabel={t.library.empty}>
            {notes.map((n) => (
              <Row key={`${n.surah}:${n.ayah}`} href={tafsirHref(n.surah, n.ayah)} icon={<NotebookPen className="size-4" />} onRemove={() => saveNote(n.surah, n.ayah, "")} removeLabel={t.reader.deleteNote}>
                {verseLabel(n.surah, n.ayah)}
                <span className="mt-1 line-clamp-2 block text-sm whitespace-pre-line text-ink-soft">{n.text}</span>
                <span className="mt-1 block text-[11px] text-muted">{date(n.updatedAt)}</span>
              </Row>
            ))}
          </List>
        )}

        {tab === "history" && (
          <>
            {history.length > 0 && (
              <div className="mb-3 flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => historyStore.write(() => [])}><Trash2 /> {t.library.clearHistory}</Button>
              </div>
            )}
            <List empty={!history.length} emptyLabel={t.library.empty}>
              {history.map((h) => (
                <Row key={`${h.surah}:${h.ayah}`} href={tafsirHref(h.surah, h.ayah, h.source)} icon={<Clock className="size-4" />}>
                  {verseLabel(h.surah, h.ayah)}
                  <span className="block text-[11px] text-muted">{h.source && <span lang="ar">{title(h.source)} · </span>}{date(h.at)}</span>
                </Row>
              ))}
            </List>
          </>
        )}
      </div>
      <p className="mt-8 text-center text-xs text-muted">{t.library.local}</p>
    </div>
  );
}

function List({ empty, emptyLabel, children }: { empty: boolean; emptyLabel: string; children: React.ReactNode }) {
  if (empty) return <p className="rounded-2xl border border-dashed border-line-strong py-14 text-center text-muted">{emptyLabel}</p>;
  return <ul className="space-y-2">{children}</ul>;
}

function Row({ href, icon, children, onRemove, removeLabel }: { href: string; icon: React.ReactNode; children: React.ReactNode; onRemove?: () => void; removeLabel?: string }) {
  return (
    <li className="group flex items-center gap-2 rounded-2xl border border-line bg-surface pe-2 transition hover:border-line-gold">
      <Link href={href} className="flex min-w-0 flex-1 items-start gap-3 p-4">
        <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold-ink">{icon}</span>
        <span className="min-w-0 flex-1">{children}</span>
      </Link>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={removeLabel} title={removeLabel} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger">
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}
