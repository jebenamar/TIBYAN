import type { Metadata } from "next";
import { OfflineReader } from "@/components/offline/offline-reader";

export const metadata: Metadata = { title: "القارئ دون اتصال — Lecteur hors ligne", robots: { index: false } };

/** Static shell; content comes exclusively from IndexedDB on the client. */
export default function OfflineReaderPage() {
  return <OfflineReader />;
}
