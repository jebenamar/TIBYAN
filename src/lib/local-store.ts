"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * Tiny typed localStorage store. Every read/write is guarded: private mode or
 * blocked storage simply yields the default value, never a crash.
 */
function createStore<T>(key: string, schema: z.ZodType<T>, fallback: T) {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | null = null;

  const read = (): T => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return fallback;
    }
    if (cache && cache.raw === raw) return cache.value;
    let value = fallback;
    if (raw) {
      try {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) value = parsed.data;
      } catch {
        /* corrupted entry → default */
      }
    }
    cache = { raw, value };
    return value;
  };

  const write = (updater: (prev: T) => T) => {
    const next = updater(read());
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage full or blocked */
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => e.key === key && l();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };

  function useValue(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }
  return { read, write, useValue };
}

/* ───── Favourites: a verse, a specific explanation, or a comparison ───── */
const favoriteSchema = z.object({
  id: z.string(),
  kind: z.enum(["verse", "explanation", "comparison"]),
  surah: z.number(),
  ayah: z.number(),
  sources: z.array(z.string()),
  createdAt: z.number(),
});
export type Favorite = z.infer<typeof favoriteSchema>;
export const favoritesStore = createStore("tafsir:favorites", z.array(favoriteSchema), []);

export function favoriteId(kind: Favorite["kind"], surah: number, ayah: number, sources: string[] = []) {
  return [kind, surah, ayah, ...sources].join(":");
}

export function toggleFavorite(f: Omit<Favorite, "id" | "createdAt">) {
  const id = favoriteId(f.kind, f.surah, f.ayah, f.sources);
  favoritesStore.write((prev) =>
    prev.some((x) => x.id === id) ? prev.filter((x) => x.id !== id) : [{ ...f, id, createdAt: Date.now() }, ...prev],
  );
}

/* ───── Personal notes (per verse) ───── */
const noteSchema = z.object({ surah: z.number(), ayah: z.number(), text: z.string().max(20_000), updatedAt: z.number() });
export type Note = z.infer<typeof noteSchema>;
export const notesStore = createStore("tafsir:notes", z.record(z.string(), noteSchema), {});
export const noteKey = (s: number, a: number) => `${s}:${a}`;

export function saveNote(surah: number, ayah: number, text: string) {
  notesStore.write((prev) => {
    const next = { ...prev };
    if (text.trim()) next[noteKey(surah, ayah)] = { surah, ayah, text, updatedAt: Date.now() };
    else delete next[noteKey(surah, ayah)];
    return next;
  });
}

/* ───── Reading history ───── */
const historySchema = z.object({ surah: z.number(), ayah: z.number(), source: z.string().nullable(), at: z.number() });
export type HistoryItem = z.infer<typeof historySchema>;
export const historyStore = createStore("tafsir:history", z.array(historySchema), []);

export function pushHistory(item: Omit<HistoryItem, "at">) {
  historyStore.write((prev) => {
    const rest = prev.filter((h) => !(h.surah === item.surah && h.ayah === item.ayah));
    return [{ ...item, at: Date.now() }, ...rest].slice(0, 200);
  });
}

/* ───── Recent searches ───── */
export const recentSearchStore = createStore("tafsir:recent-searches", z.array(z.string().max(200)), []);

export function pushRecentSearch(q: string) {
  const v = q.trim();
  if (!v) return;
  recentSearchStore.write((prev) => [v, ...prev.filter((x) => x !== v)].slice(0, 8));
}
