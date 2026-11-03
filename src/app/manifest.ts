import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "تفسير — Tafsir du Saint Coran",
    short_name: "تفسير",
    description: "Consultation et comparaison des grands Tafsirs du Coran, en ligne et hors connexion.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    dir: "rtl",
    lang: "ar",
    background_color: "#f8f5ed",
    theme_color: "#063d35",
    categories: ["books", "education", "reference"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "آية الكرسي — 2:255", url: "/tafsir/2/255" },
      { name: "البحث", url: "/recherche" },
      { name: "دون اتصال", url: "/hors-ligne" },
    ],
  };
}
