import { ShieldAlert, ShieldCheck, ShieldHalf } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";
import { Badge } from "./ui/badge";

export function LicenseBadge({ status, t }: { status: "OPEN" | "NON_COMMERCIAL" | "UNVERIFIED"; t: Dictionary }) {
  if (status === "OPEN") return <Badge tone="jade"><ShieldCheck className="size-3" />{t.license.OPEN}</Badge>;
  if (status === "NON_COMMERCIAL") return <Badge tone="gold"><ShieldHalf className="size-3" />{t.license.NON_COMMERCIAL}</Badge>;
  return <Badge tone="warn"><ShieldAlert className="size-3" />{t.license.UNVERIFIED}</Badge>;
}
