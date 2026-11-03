import type { Metadata } from "next";
import { LibraryView } from "@/components/library/library-view";
import { getI18n } from "@/lib/prefs.server";

export const metadata: Metadata = { title: "مكتبتي — Bibliothèque", robots: { index: false } };

export default async function LibraryPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl text-primary sm:text-4xl dark:text-ink">{t.library.title}</h1>
      <LibraryView />
    </div>
  );
}
