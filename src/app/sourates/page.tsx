import type { Metadata } from "next";
import { SurahGrid } from "@/components/home/surah-grid";
import { getI18n } from "@/lib/prefs.server";

export const metadata: Metadata = { title: "السور — Sourates" };

export default async function SurahsPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="mb-6 font-display text-3xl text-primary sm:text-4xl dark:text-ink">{t.home.allSurahs}</h1>
      <SurahGrid />
    </div>
  );
}
