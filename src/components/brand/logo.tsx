import { cn } from "@/lib/utils";

/** Eight-pointed khatam star enclosing an open-book arch — the app mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-9", className)}>
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--gold-ink)" />
        </linearGradient>
      </defs>
      <rect x="9" y="9" width="30" height="30" rx="3" fill="var(--primary)" />
      <rect x="9" y="9" width="30" height="30" rx="3" fill="var(--primary)" transform="rotate(45 24 24)" />
      <rect x="11.5" y="11.5" width="25" height="25" rx="2" fill="none" stroke="url(#lm-g)" strokeWidth="0.9" />
      <rect x="11.5" y="11.5" width="25" height="25" rx="2" fill="none" stroke="url(#lm-g)" strokeWidth="0.9" transform="rotate(45 24 24)" />
      <path d="M17 30.5c2.6-1.4 4.9-1.4 7 0 2.1-1.4 4.4-1.4 7 0V19.5c-2.6-1.4-4.9-1.4-7 0-2.1-1.4-4.4-1.4-7 0Z" fill="none" stroke="var(--primary-ink)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M24 19.5v11" stroke="var(--primary-ink)" strokeWidth="1.2" />
      <circle cx="24" cy="15.4" r="1.1" fill="url(#lm-g)" />
    </svg>
  );
}

export function Wordmark({ className, tagline }: { className?: string; tagline?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.45rem] font-bold text-primary dark:text-ink" lang="ar">
          تفسير
        </span>
        {tagline && <span className="mt-1 text-[10.5px] tracking-[0.12em] text-muted uppercase">{tagline}</span>}
      </span>
    </span>
  );
}
