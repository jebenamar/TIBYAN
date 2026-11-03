import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { CompareStart } from "@/components/compare/compare-start";
import { getI18n } from "@/lib/prefs.server";

export const metadata: Metadata = { title: "مقارنة التفاسير — Comparer" };

export default async function CompareIndex() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-ink"><Scale className="size-7" /></span>
      <h1 className="mt-5 font-display text-4xl text-primary dark:text-ink">{t.compare.title}</h1>
      <p className="mt-3 text-muted">{t.compare.choose}</p>
      <CompareStart />
      <p className="mt-6 text-xs text-muted">{t.compare.disclaimer}</p>
    </div>
  );
}
