import { BookMarked, BookOpen, Columns3, Home, Library, Search, Settings2, WifiOff } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";

export function navItems(t: Dictionary) {
  return [
    { href: "/", label: t.nav.home, icon: Home, mobile: true },
    { href: "/sourates", label: t.nav.surahs, icon: BookOpen, mobile: true },
    { href: "/recherche", label: t.nav.search, icon: Search, mobile: true },
    { href: "/comparer", label: t.nav.compare, icon: Columns3, mobile: false },
    { href: "/bibliotheque", label: t.nav.library, icon: BookMarked, mobile: true },
    { href: "/hors-ligne", label: t.nav.offline, icon: WifiOff, mobile: false },
    { href: "/sources", label: t.nav.sources, icon: Library, mobile: false },
    { href: "/reglages", label: t.nav.settings, icon: Settings2, mobile: true },
  ];
}

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/sourates") return pathname.startsWith("/sourate") || pathname.startsWith("/tafsir");
  return pathname.startsWith(href);
}
