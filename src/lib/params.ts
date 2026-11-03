import { z } from "zod";
import { getSurah } from "./surahs";

const int = z.coerce.number().int();

/** Validates /tafsir/[surah]/[ayah] params against the real surah lengths. */
export function parseVerseParams(p: { surah: string; ayah: string }) {
  const surah = int.min(1).max(114).safeParse(p.surah);
  if (!surah.success) return null;
  const meta = getSurah(surah.data)!;
  const ayah = int.min(1).max(meta.versesCount).safeParse(p.ayah);
  if (!ayah.success) return null;
  return { surah: surah.data, ayah: ayah.data, meta };
}

export function adjacentVerses(surah: number, ayah: number) {
  const meta = getSurah(surah)!;
  const prev =
    ayah > 1 ? { surah, ayah: ayah - 1 } : surah > 1 ? { surah: surah - 1, ayah: getSurah(surah - 1)!.versesCount } : null;
  const next = ayah < meta.versesCount ? { surah, ayah: ayah + 1 } : surah < 114 ? { surah: surah + 1, ayah: 1 } : null;
  return { prev, next };
}

const slug = z.string().regex(/^[a-z0-9-]{1,40}$/);

export function parseSourceList(raw: string | string[] | undefined, max = 3): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  const out: string[] = [];
  for (const s of value.split(",")) {
    const r = slug.safeParse(s.trim());
    if (r.success && !out.includes(r.data)) out.push(r.data);
  }
  return out.slice(0, max);
}

export function parseSource(raw: string | string[] | undefined): string | undefined {
  const r = slug.safeParse(Array.isArray(raw) ? raw[0] : raw);
  return r.success ? r.data : undefined;
}
