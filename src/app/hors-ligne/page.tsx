import type { Metadata } from "next";
import Link from "next/link";
import { CloudDownload } from "lucide-react";
import { OfflineManager } from "@/components/offline/offline-manager";
import { getI18n } from "@/lib/prefs.server";

export const metadata: Metadata = { title: "دون اتصال — Hors ligne", robots: { index: false } };

export default async function OfflinePage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <span className="grid size-12 place-items-center rounded-2xl bg-gold-soft text-gold-ink"><CloudDownload className="size-6" /></span>
      <h1 className="mt-4 font-display text-3xl text-primary sm:text-4xl dark:text-ink">{t.offline.title}</h1>
      <p className="mt-3 leading-relaxed text-muted">{t.offline.intro}</p>
      <Link href="/hors-ligne/lire?s=1&a=1" className="mt-3 inline-block text-sm text-accent hover:underline">{t.offline.openOfflineReader}</Link>
      <div className="mt-8"><OfflineManager /></div>
    </div>
  );
}
