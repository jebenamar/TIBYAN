"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SearchPanel } from "@/components/search/search-panel";
import { useApp } from "@/components/providers";

const PaletteContext = createContext<{ open: () => void }>({ open: () => {} });
export const usePalette = () => useContext(PaletteContext);

function isTypingTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  return !!node && (node.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(node.tagName));
}

/** Global search palette — ⌘K / Ctrl+K / "/" from anywhere. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const { t } = useApp();
  const open = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <PaletteContext.Provider value={{ open }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0">
          <DialogTitle className="sr-only">{t.nav.search}</DialogTitle>
          <DialogDescription className="sr-only">{t.search.hint}</DialogDescription>
          {isOpen && <SearchPanel autoFocus onNavigate={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </PaletteContext.Provider>
  );
}
