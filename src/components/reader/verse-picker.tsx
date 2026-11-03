"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListOrdered } from "lucide-react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmt } from "@/i18n/dictionaries";
import { getSurah, SURAHS, surahDisplayName } from "@/lib/surahs";

/** Surah + verse selector with validation against each surah's real length. */
export function VersePicker({ surah, ayah, basePath = "/tafsir", query = "" }: { surah: number; ayah: number; basePath?: string; query?: string }) {
  const { t, locale } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(surah);
  const [a, setA] = useState(String(ayah));
  const meta = getSurah(s)!;
  const n = Number(a);
  const valid = Number.isInteger(n) && n >= 1 && n <= meta.versesCount;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setS(surah); setA(String(ayah)); } }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t.reader.pickAyah}>
          <ListOrdered /> <span className="hidden sm:inline">{t.reader.pickAyah}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            setOpen(false);
            router.push(`${basePath}/${s}/${n}${query}`);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">{t.reader.surah}</span>
            <select
              value={s}
              onChange={(e) => { setS(Number(e.target.value)); setA("1"); }}
              className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-ink outline-none focus:border-accent"
            >
              {SURAHS.map((x) => (
                <option key={x.number} value={x.number}>
                  {x.number}. {x.nameArabic} — {surahDisplayName(x, locale)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-medium text-muted">
              <span>{t.reader.ayah}</span>
              <span className="tabular-nums">1 – {meta.versesCount}</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={meta.versesCount}
              value={a}
              onChange={(e) => setA(e.target.value)}
              aria-invalid={!valid}
              className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-ink tabular-nums outline-none focus:border-accent aria-[invalid=true]:border-danger"
            />
            {!valid && a !== "" && <span className="mt-1.5 block text-xs text-danger">{fmt(t.search.invalidAyah, { n: meta.versesCount })}</span>}
          </label>
          <Button type="submit" variant="primary" className="w-full" disabled={!valid}>
            {t.reader.go}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
