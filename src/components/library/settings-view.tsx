"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useApp } from "@/components/providers";
import { LOCALE_LABELS, LOCALES } from "@/i18n/dictionaries";
import type { Prefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const { t, prefs, updatePrefs, sources } = useApp();
  return (
    <div className="space-y-6">
      <Card title={t.settings.reading}>
        <Range label={t.settings.fontSize} min={0.8} max={1.8} step={0.05} value={prefs.scale} display={`${Math.round(prefs.scale * 100)}%`} onChange={(v) => updatePrefs({ scale: v })} />
        <Range label={t.settings.spacing} min={1.6} max={2.8} step={0.1} value={prefs.leading} display={prefs.leading.toFixed(1)} onChange={(v) => updatePrefs({ leading: Math.round(v * 10) / 10 })} />
        <Segmented
          label={t.settings.width}
          value={prefs.width}
          options={[["narrow", t.settings.narrow], ["medium", t.settings.medium], ["wide", t.settings.wide]]}
          onChange={(v) => updatePrefs({ width: v as Prefs["width"] })}
        />
        <div className="rounded-xl border border-line bg-surface-2/50 p-4">
          <p className="mb-2 text-xs text-muted">{t.settings.preview}</p>
          <p dir="rtl" lang="ar" className="tafsir-prose" style={{ maxWidth: "var(--reader-width)" }}>
            هذا نص تجريبي لمعاينة حجم الخط وتباعد الأسطر وعرض عمود القراءة، وليس من نصوص التفسير.
          </p>
        </div>
      </Card>

      <Card title={t.settings.theme}>
        <Segmented
          label={t.settings.theme}
          value={prefs.theme}
          options={[["light", t.settings.light, <Sun key="s" className="size-4" />], ["dark", t.settings.dark, <Moon key="m" className="size-4" />], ["system", t.settings.system, <Monitor key="c" className="size-4" />]]}
          onChange={(v) => updatePrefs({ theme: v as Prefs["theme"] })}
        />
      </Card>

      <Card title={t.settings.preferred}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={t.settings.preferred}>
          {sources.map((s) => (
            <button
              key={s.slug}
              type="button"
              role="radio"
              aria-checked={prefs.preferred === s.slug}
              onClick={() => updatePrefs({ preferred: s.slug })}
              className={cn("rounded-xl border px-3 py-3 font-display text-[15px] transition", prefs.preferred === s.slug ? "border-line-gold bg-gold-soft text-ink" : "border-line text-ink-soft hover:border-line-strong")}
            >
              <span lang="ar">{s.titleArabic}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card title={t.settings.language}>
        <Segmented
          label={t.settings.language}
          value={prefs.locale}
          options={LOCALES.map((l) => [l, LOCALE_LABELS[l]] as [string, string])}
          onChange={(v) => updatePrefs({ locale: v as Prefs["locale"] })}
        />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="hairline space-y-5 rounded-2xl bg-surface p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Range({ label, min, max, step, value, display, onChange }: { label: string; min: number; max: number; step: number; value: number; display: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 flex justify-between text-sm text-ink-soft">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{display}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
    </label>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string, React.ReactNode?]>; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-line-strong bg-surface-2/50 p-1">
      {options.map(([v, l, icon]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm transition", value === v ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}
        >
          {icon} {l}
        </button>
      ))}
    </div>
  );
}
