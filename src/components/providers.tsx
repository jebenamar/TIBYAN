"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DICTIONARIES, dirOf, type Dictionary, type Locale } from "@/i18n/dictionaries";
import { PREFS_COOKIE, prefsStyle, serializePrefs, type Prefs } from "@/lib/prefs";

export interface SourceSummary {
  slug: string;
  titleArabic: string;
  titleLatin: string;
  authorArabic: string;
  licenseStatus: "OPEN" | "NON_COMMERCIAL" | "UNVERIFIED";
}

interface AppContextValue {
  prefs: Prefs;
  t: Dictionary;
  locale: Locale;
  sources: SourceSummary[];
  updatePrefs: (patch: Partial<Prefs>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function applyToDocument(p: Prefs) {
  const html = document.documentElement;
  if (p.theme === "system") html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", p.theme);
  html.lang = p.locale;
  html.dir = dirOf(p.locale);
  for (const [k, v] of Object.entries(prefsStyle(p))) html.style.setProperty(k, v);
}

export function AppProvider({ initialPrefs, sources, children }: { initialPrefs: Prefs; sources: SourceSummary[]; children: ReactNode }) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const router = useRouter();

  const updatePrefs = useCallback(
    (patch: Partial<Prefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        document.cookie = `${PREFS_COOKIE}=${serializePrefs(next)}; path=/; max-age=31536000; samesite=lax`;
        applyToDocument(next);
        // Server components render localised text: refresh when the language changes.
        if (patch.locale && patch.locale !== prev.locale) router.refresh();
        return next;
      });
    },
    [router],
  );

  const value = useMemo(
    () => ({ prefs, t: DICTIONARIES[prefs.locale], locale: prefs.locale, sources, updatePrefs }),
    [prefs, sources, updatePrefs],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
