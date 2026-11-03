"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Monitor, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { useApp } from "@/components/providers";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CommandPaletteProvider, usePalette } from "./command-palette";
import { isActive, navItems } from "./nav-items";
import { ConnectivityBadge } from "./connectivity";
import { SurahQuickList } from "./surah-quick-list";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <CommandPaletteProvider>
        <a href="#main" className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 text-primary-ink focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
          <SkipLabel />
        </a>
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main id="main" className="flex-1 pb-24 lg:pb-10">
              {children}
            </main>
          </div>
        </div>
        <MobileNav />
      </CommandPaletteProvider>
    </TooltipProvider>
  );
}

function SkipLabel() {
  const { t } = useApp();
  return <>{t.common.skip}</>;
}

function Sidebar() {
  const { t, prefs, updatePrefs } = useApp();
  const pathname = usePathname();
  const collapsed = prefs.sidebar === "collapsed";
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-line bg-surface/70 backdrop-blur-xl transition-[width] duration-300 ease-out-expo lg:flex",
        collapsed ? "w-[76px]" : "w-[272px]",
      )}
      aria-label={t.appName}
    >
      <div className={cn("flex h-[72px] items-center border-b border-line", collapsed ? "justify-center" : "justify-between px-5")}>
        <Link href="/" aria-label={t.nav.home} className="rounded-xl">
          {collapsed ? <LogoMark /> : <Wordmark tagline={t.appTagline} />}
        </Link>
      </div>

      <nav className="px-3 py-4">
        <ul className="space-y-1">
          {navItems(t).map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const link = (
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors",
                  collapsed && "justify-center px-0",
                  active ? "text-primary dark:text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl border border-line-gold bg-gold-soft"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon className="relative size-[18px] shrink-0" aria-hidden="true" />
                {!collapsed && <span className="relative">{label}</span>}
              </Link>
            );
            return <li key={href}>{collapsed ? <Tooltip label={label} side="right">{link}</Tooltip> : link}</li>;
          })}
        </ul>
      </nav>

      {!collapsed && <SurahQuickList />}

      <div className={cn("mt-auto flex items-center border-t border-line p-3", collapsed ? "flex-col gap-2" : "justify-between")}>
        <ConnectivityBadge compact={collapsed} />
        <Tooltip label={collapsed ? t.common.expand : t.common.collapse} side="right">
          <button
            type="button"
            onClick={() => updatePrefs({ sidebar: collapsed ? "open" : "collapsed" })}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
            aria-label={collapsed ? t.common.expand : t.common.collapse}
            aria-expanded={!collapsed}
          >
            <ToggleIcon className="size-[18px] rtl:-scale-x-100" />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}

function TopBar() {
  const { t } = useApp();
  const { open } = usePalette();
  return (
    <header className="glass sticky top-0 z-40 border-b border-line">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Link href="/" className="rounded-xl lg:hidden" aria-label={t.nav.home}>
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={open}
          className="group ms-auto flex h-11 items-center gap-3 rounded-xl border border-line-strong bg-surface/70 px-3 text-sm text-muted transition hover:border-line-gold hover:text-ink lg:ms-0 lg:w-full lg:max-w-xl lg:px-4"
          aria-label={t.search.open}
        >
          <Search className="size-[18px] text-gold-ink" />
          <span className="hidden truncate sm:inline">{t.search.shortPlaceholder}</span>
          <span className="ms-auto hidden items-center gap-1 lg:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <div className="flex items-center gap-1 lg:ms-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function ThemeToggle() {
  const { t, prefs, updatePrefs } = useApp();
  const order = ["system", "light", "dark"] as const;
  const next = order[(order.indexOf(prefs.theme) + 1) % order.length];
  const Icon = prefs.theme === "light" ? Sun : prefs.theme === "dark" ? Moon : Monitor;
  const label = `${t.common.theme}: ${t.settings[prefs.theme]}`;
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={() => updatePrefs({ theme: next })}
        className="grid size-11 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink"
        aria-label={label}
      >
        <Icon className="size-[18px]" />
      </button>
    </Tooltip>
  );
}

function MobileNav() {
  const { t } = useApp();
  const pathname = usePathname();
  const { open } = usePalette();
  const items = navItems(t).filter((i) => i.mobile);
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden no-print"
      aria-label={t.nav.home}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          const isSearch = href === "/recherche";
          const content = (
            <>
              <span
                className={cn(
                  "grid place-items-center rounded-2xl transition-all",
                  isSearch ? "size-12 -translate-y-3 bg-primary text-primary-ink shadow-lift ring-4 ring-bg" : "size-8",
                  !isSearch && active && "bg-gold-soft text-gold-ink",
                )}
              >
                <Icon className={isSearch ? "size-5" : "size-[19px]"} aria-hidden="true" />
              </span>
              <span className={cn("text-[10.5px] leading-none", isSearch && "-mt-2")}>{label}</span>
            </>
          );
          const cls = cn("flex h-16 w-full flex-col items-center justify-center gap-1", active ? "text-ink" : "text-muted");
          return (
            <li key={href}>
              {isSearch ? (
                <button type="button" onClick={open} className={cls} aria-label={t.search.open}>
                  {content}
                </button>
              ) : (
                <Link href={href} className={cls} aria-current={active ? "page" : undefined}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
