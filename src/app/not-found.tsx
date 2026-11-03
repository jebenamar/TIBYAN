import Link from "next/link";
import { Rosette } from "@/components/brand/rosette";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/prefs.server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="relative isolate mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <Rosette className="absolute top-0 -z-10 w-[520px] max-w-none opacity-50" />
      <p className="font-display text-7xl text-gold-ink">٤٠٤</p>
      <h1 className="mt-4 font-display text-3xl text-ink">{t.common.notFound}</h1>
      <Button asChild variant="primary" className="mt-8"><Link href="/">{t.nav.home}</Link></Button>
    </div>
  );
}
