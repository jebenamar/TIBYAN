"use client";

import { useSyncExternalStore } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useApp } from "@/components/providers";
import { cn } from "@/lib/utils";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function ConnectivityBadge({ compact }: { compact?: boolean }) {
  const online = useOnline();
  const { t } = useApp();
  const label = online ? t.offline.online : t.offline.offline;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        online ? "border-line text-muted" : "border-danger/40 bg-danger/10 text-danger",
      )}
      title={label}
    >
      {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {!compact && label}
    </span>
  );
}
