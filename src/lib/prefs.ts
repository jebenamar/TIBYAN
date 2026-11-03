import { z } from "zod";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/dictionaries";

export const PREFS_COOKIE = "tafsir_prefs";

export const READING_WIDTHS = { narrow: "38rem", medium: "46rem", wide: "60rem" } as const;

export const prefsSchema = z.object({
  locale: z.enum(LOCALES).catch(DEFAULT_LOCALE),
  theme: z.enum(["light", "dark", "system"]).catch("system"),
  scale: z.number().min(0.8).max(1.8).catch(1),
  leading: z.number().min(1.6).max(2.8).catch(2.1),
  width: z.enum(["narrow", "medium", "wide"]).catch("medium"),
  preferred: z.string().regex(/^[a-z0-9-]{1,40}$/).catch("muyassar"),
  sidebar: z.enum(["open", "collapsed"]).catch("open"),
});

export type Prefs = z.infer<typeof prefsSchema>;

export const DEFAULT_PREFS: Prefs = prefsSchema.parse({});

export function parsePrefs(raw: string | undefined): Prefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = prefsSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function serializePrefs(p: Prefs): string {
  return encodeURIComponent(JSON.stringify(p));
}

export function prefsStyle(p: Prefs): Record<string, string> {
  return {
    "--reader-scale": String(p.scale),
    "--reader-leading": String(p.leading),
    "--reader-width": READING_WIDTHS[p.width],
  };
}
