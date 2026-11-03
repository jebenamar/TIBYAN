import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Amiri, Amiri_Quran, Geist, Noto_Naskh_Arabic } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { AppProvider, type SourceSummary } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { dirOf } from "@/i18n/dictionaries";
import { log } from "@/lib/log";
import { prefsStyle } from "@/lib/prefs";
import { getI18n } from "@/lib/prefs.server";
import { getSources } from "@/lib/queries";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const naskh = Noto_Naskh_Arabic({ variable: "--font-naskh", subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap" });
const amiri = Amiri({ variable: "--font-amiri", subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
// Amiri Quran (SIL Open Font License) — designed for Quranic text with full mark positioning.
const amiriQuran = Amiri_Quran({ variable: "--font-amiri-quran", subsets: ["arabic"], weight: "400", display: "swap", preload: true });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "تفسير — Tafsir du Saint Coran", template: "%s · تفسير" },
  description:
    "Consultez et comparez les grands Tafsirs du Coran — Al-Muyassar, As-Sa'di, Ibn Kathir, At-Tabari, Al-Qurtubi, Al-Baghawi, Al-Jalalayn — dans leurs textes arabes originaux.",
  applicationName: "Tafsir",
  appleWebApp: { capable: true, title: "تفسير", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", siteName: "تفسير — Tafsir", locale: "ar" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ed" },
    { media: "(prefers-color-scheme: dark)", color: "#071b19" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

async function loadSourceSummaries(): Promise<SourceSummary[]> {
  try {
    const sources = await getSources();
    return sources.map((s) => ({ slug: s.slug, titleArabic: s.titleArabic, titleLatin: s.titleLatin, authorArabic: s.authorArabic, licenseStatus: s.licenseStatus }));
  } catch (err) {
    log.error("layout.sources_unavailable", { err });
    return [];
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ prefs, locale }, sources] = await Promise.all([getI18n(), loadSourceSummaries()]);
  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      data-theme={prefs.theme === "system" ? undefined : prefs.theme}
      style={prefsStyle(prefs) as React.CSSProperties}
      className={`${geist.variable} ${naskh.variable} ${amiri.variable} ${amiriQuran.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <AppProvider initialPrefs={prefs} sources={sources}>
          <AppShell>{children}</AppShell>
        </AppProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
