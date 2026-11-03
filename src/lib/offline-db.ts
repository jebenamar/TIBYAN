"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { normalizeForSearch } from "./arabic";
import { queryTerms, snippet, type Range } from "./highlight";

export interface OfflineSource {
  slug: string;
  titleArabic: string;
  authorArabic: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
  licenseStatus: string;
  version: string;
  importedAt: string | null;
}

export interface OfflineBundle {
  format: 1;
  source: OfflineSource;
  surah: number;
  quranAttribution: string;
  ayahs: Array<[number, string, string]>;
  entries: Array<[number, number, string, string]>;
}

interface Schema extends DBSchema {
  sources: { key: string; value: OfflineSource };
  quran: { key: number; value: { surah: number; ayahs: Array<[number, string, string]>; attribution: string } };
  tafsir: {
    key: string; // `${slug}:${surah}`
    value: { key: string; slug: string; surah: number; version: string; importedAt: string | null; bytes: number; savedAt: number; entries: OfflineBundle["entries"] };
    indexes: { bySlug: string };
  };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB<Schema>("tafsir-offline", 1, {
      upgrade(d) {
        d.createObjectStore("sources", { keyPath: "slug" });
        d.createObjectStore("quran", { keyPath: "surah" });
        const t = d.createObjectStore("tafsir", { keyPath: "key" });
        t.createIndex("bySlug", "slug");
      },
    });
  }
  return dbPromise;
}

export function isOfflineSupported() {
  return typeof indexedDB !== "undefined";
}

/** Downloads and stores one (source, surah) bundle. Returns stored byte size. */
export async function downloadSurah(slug: string, surah: number, signal?: AbortSignal): Promise<number> {
  const res = await fetch(`/api/offline/${slug}/${surah}`, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const bundle = JSON.parse(text) as OfflineBundle;
  if (bundle.format !== 1 || bundle.surah !== surah || bundle.source.slug !== slug) throw new Error("Invalid bundle");
  const d = await db();
  const tx = d.transaction(["sources", "quran", "tafsir"], "readwrite");
  await Promise.all([
    tx.objectStore("sources").put(bundle.source),
    tx.objectStore("quran").put({ surah, ayahs: bundle.ayahs, attribution: bundle.quranAttribution }),
    tx.objectStore("tafsir").put({
      key: `${slug}:${surah}`, slug, surah, version: bundle.source.version, importedAt: bundle.source.importedAt,
      bytes: text.length * 2, savedAt: Date.now(), entries: bundle.entries,
    }),
    tx.done,
  ]);
  return text.length * 2;
}

export interface DownloadStatus {
  slug: string;
  surahs: number[];
  bytes: number;
  versions: Set<string>;
  importedAt: Set<string | null>;
}

export async function getDownloadStatus(): Promise<Map<string, DownloadStatus>> {
  const d = await db();
  const out = new Map<string, DownloadStatus>();
  let cursor = await d.transaction("tafsir").store.openCursor();
  while (cursor) {
    const v = cursor.value;
    const s = out.get(v.slug) ?? { slug: v.slug, surahs: [], bytes: 0, versions: new Set(), importedAt: new Set() };
    s.surahs.push(v.surah);
    s.bytes += v.bytes;
    s.versions.add(v.version);
    s.importedAt.add(v.importedAt);
    out.set(v.slug, s);
    cursor = await cursor.continue();
  }
  return out;
}

export async function removeSource(slug: string) {
  const d = await db();
  const keys = await d.getAllKeysFromIndex("tafsir", "bySlug", slug);
  const tx = d.transaction(["tafsir", "sources"], "readwrite");
  await Promise.all([...keys.map((k) => tx.objectStore("tafsir").delete(k)), tx.objectStore("sources").delete(slug), tx.done]);
}

export async function getOfflineSources(): Promise<OfflineSource[]> {
  return (await db()).getAll("sources");
}

export async function getOfflineVerse(surah: number, ayah: number) {
  const d = await db();
  const q = await d.get("quran", surah);
  const verse = q?.ayahs.find((a) => a[0] === ayah);
  return verse ? { textArabic: verse[1], textSimple: verse[2], attribution: q!.attribution, count: q!.ayahs.length } : null;
}

export async function getOfflineEntry(slug: string, surah: number, ayah: number) {
  const row = await (await db()).get("tafsir", `${slug}:${surah}`);
  if (!row) return { downloaded: false as const };
  const e = row.entries.find(([s, en]) => s <= ayah && en >= ayah);
  return { downloaded: true as const, entry: e ? { ayahStart: e[0], ayahEnd: e[1], html: e[2], text: e[3] } : null };
}

export async function getOfflineSurahsWithText(): Promise<number[]> {
  return (await (await db()).getAllKeys("quran")).sort((a, b) => a - b);
}

export interface LocalHit { kind: "quran" | "tafsir"; slug?: string; surah: number; ayahStart: number; ayahEnd: number; text: string; ranges: Range[] }

/** Searches ONLY the data actually stored on this device. */
export async function searchOffline(q: string, limit = 40): Promise<LocalHit[]> {
  const norm = normalizeForSearch(q);
  if (norm.length < 2) return [];
  const terms = queryTerms(q);
  const d = await db();
  const hits: LocalHit[] = [];
  for (const row of await d.getAll("quran")) {
    for (const [n, uthmani, simple] of row.ayahs) {
      if (normalizeForSearch(simple).includes(norm)) {
        const s = snippet(uthmani, terms, 10_000);
        hits.push({ kind: "quran", surah: row.surah, ayahStart: n, ayahEnd: n, text: uthmani, ranges: s.ranges });
        if (hits.length >= limit) return hits;
      }
    }
  }
  let cursor = await d.transaction("tafsir").store.openCursor();
  while (cursor && hits.length < limit) {
    const row = cursor.value;
    for (const [s, e, , text] of row.entries) {
      if (normalizeForSearch(text).includes(norm)) {
        const sn = snippet(text, terms);
        hits.push({ kind: "tafsir", slug: row.slug, surah: row.surah, ayahStart: s, ayahEnd: e, text: sn.text, ranges: sn.ranges });
        if (hits.length >= limit) break;
      }
    }
    cursor = await cursor.continue();
  }
  return hits;
}

export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}

export async function requestPersistence() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
