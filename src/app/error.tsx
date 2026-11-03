"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useApp();
  useEffect(() => {
    console.error(JSON.stringify({ level: "error", event: "ui.error_boundary", message: error.message, digest: error.digest }));
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-3xl text-ink">{t.common.error}</h1>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">{error.digest}</p>}
      <Button variant="primary" className="mt-8" onClick={reset}><RotateCcw /> {t.common.retry}</Button>
    </div>
  );
}
