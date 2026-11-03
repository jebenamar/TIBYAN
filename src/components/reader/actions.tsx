"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Columns3, Copy, Heart, Share2 } from "lucide-react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { favoriteId, favoritesStore, pushHistory, toggleFavorite, type Favorite } from "@/lib/local-store";
import { cn } from "@/lib/utils";

export function useFlash(ms = 1800) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return;
    const id = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(id);
  }, [on, ms]);
  return [on, () => setOn(true)] as const;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export async function shareLink(url: string, title: string): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ url, title });
      return "shared";
    } catch {
      return "failed";
    }
  }
  return (await copyText(url)) ? "copied" : "failed";
}

export function ReaderActions({
  surah, ayah, source, copyPayload, compareHref,
}: {
  surah: number; ayah: number; source: string | null; copyPayload: string | null; compareHref: string;
}) {
  const { t } = useApp();
  const favorites = favoritesStore.useValue();
  const [copied, flashCopied] = useFlash();
  const [shared, flashShared] = useFlash();

  const fav = (kind: Favorite["kind"], sources: string[]) => favorites.some((f) => f.id === favoriteId(kind, surah, ayah, sources));
  const isVerseFav = fav("verse", []);
  const isExplFav = source ? fav("explanation", [source]) : false;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {copyPayload && (
        <Button size="sm" variant="ghost" onClick={async () => (await copyText(copyPayload)) && flashCopied()}>
          {copied ? <Check className="text-accent" /> : <Copy />} {copied ? t.reader.copied : t.reader.copy}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          const r = await shareLink(location.href, document.title);
          if (r === "copied") flashShared();
        }}
      >
        {shared ? <Check className="text-accent" /> : <Share2 />} {shared ? t.reader.linkCopied : t.reader.share}
      </Button>
      {source && (
        <Tooltip label={isExplFav ? t.reader.unfavorite : t.reader.favorite}>
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={isExplFav}
            onClick={() => toggleFavorite({ kind: "explanation", surah, ayah, sources: [source] })}
          >
            <Heart className={cn(isExplFav && "fill-current text-danger")} />
            <span className="sr-only sm:not-sr-only">{t.library.explanation}</span>
          </Button>
        </Tooltip>
      )}
      <Tooltip label={isVerseFav ? t.reader.unfavorite : t.reader.favorite}>
        <Button size="sm" variant="ghost" aria-pressed={isVerseFav} onClick={() => toggleFavorite({ kind: "verse", surah, ayah, sources: [] })}>
          <Heart className={cn(isVerseFav && "fill-current text-gold")} />
          <span className="sr-only sm:not-sr-only">{t.library.verse}</span>
        </Button>
      </Tooltip>
      <Button size="sm" variant="gold" asChild>
        <Link href={compareHref}>
          <Columns3 /> {t.reader.compare}
        </Link>
      </Button>
    </div>
  );
}

/** Records reading history and wires ←/→ (direction-aware) to previous/next verse. */
export function ReaderEffects({ surah, ayah, source, prevHref, nextHref }: { surah: number; ayah: number; source: string | null; prevHref: string | null; nextHref: string | null }) {
  const router = useRouter();
  const { locale } = useApp();
  useEffect(() => {
    pushHistory({ surah, ayah, source });
  }, [surah, ayah, source]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const rtl = locale === "ar";
      // In RTL reading order, "next" is to the left.
      const goNext = (e.key === "ArrowLeft" && rtl) || (e.key === "ArrowRight" && !rtl) || e.key === "j";
      const goPrev = (e.key === "ArrowRight" && rtl) || (e.key === "ArrowLeft" && !rtl) || e.key === "k";
      if (goNext && nextHref) { e.preventDefault(); router.push(nextHref, { scroll: false }); }
      if (goPrev && prevHref) { e.preventDefault(); router.push(prevHref, { scroll: false }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevHref, nextHref, locale]);
  return null;
}
