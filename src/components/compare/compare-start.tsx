"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { fmt } from "@/i18n/dictionaries";
import { historyStore } from "@/lib/local-store";
import { compareHref, parseReference } from "@/lib/reference";

/** Entry point of the comparator: type a reference (2:255, الكهف 10) and pick up to three tafsirs. */
export function CompareStart() {
  const { t, sources, prefs } = useApp();
  const router = useRouter();
  const last = historyStore.useValue()[0];
  const [ref, setRef] = useState("");
  const [picked, setPicked] = useState<string[]>(() => [...new Set([prefs.preferred, sources.find((s) => s.slug !== prefs.preferred)?.slug ?? ""])].filter(Boolean));
  const parsed = ref.trim() ? parseReference(ref) : last ? null : null;
  const target = parsed?.kind === "ayah" ? { s: parsed.surah.number, a: parsed.ayah } : !ref.trim() && last ? { s: last.surah, a: last.ayah } : null;

  return (
    <form
      className="mt-8 space-y-5 text-start"
      onSubmit={(e) => {
        e.preventDefault();
        if (target && picked.length) router.push(compareHref(target.s, target.a, picked));
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">{t.reader.ayah}</span>
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder={last ? `${last.surah}:${last.ayah}` : "2:255"}
          className="h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-ink outline-none focus:border-accent"
          aria-describedby="ref-hint"
        />
        <span id="ref-hint" className="mt-1.5 block text-xs text-danger">
          {parsed?.kind === "invalid-ayah" && fmt(t.search.invalidAyah, { n: parsed.surah.versesCount })}
        </span>
      </label>
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-muted">{t.compare.choose}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sources.map((s) => {
            const on = picked.includes(s.slug);
            return (
              <label key={s.slug} className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-center font-display text-[15px] transition ${on ? "border-line-gold bg-gold-soft text-ink" : "border-line text-ink-soft hover:border-line-strong"}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  disabled={!on && picked.length >= 3}
                  onChange={() => setPicked((p) => (on ? p.filter((x) => x !== s.slug) : [...p, s.slug]))}
                />
                <span lang="ar">{s.titleArabic}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!target || picked.length === 0}>
        {t.compare.title}
      </Button>
    </form>
  );
}
