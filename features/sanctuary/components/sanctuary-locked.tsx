import Link from "next/link";
import { LockKeyholeIcon, MapIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Content-free temporary state shown while a verse is under active practice. */
export async function SanctuaryLocked({
  reference,
  waypointId,
}: {
  reference: string;
  waypointId: string | null;
}): Promise<React.ReactNode> {
  const t = await getTranslations("Sanctuary");
  return (
    <main className="grid min-h-dvh place-items-center bg-linear-to-b from-violet-50 via-background to-emerald-50 px-4 dark:from-violet-950 dark:via-slate-950 dark:to-emerald-950">
      <section className="w-full max-w-sm rounded-[2rem] border border-violet-300/30 bg-card/90 p-7 text-center shadow-xl">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300">
          <LockKeyholeIcon className="size-9" aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-black tracking-[0.16em] text-violet-700 uppercase dark:text-violet-300">{reference}</p>
        <h1 className="mt-2 font-heading text-3xl font-black">{t("practiceInProgress")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("reopensAfterRadiance")}</p>
        <Link
          href={waypointId ? `/game/waypoints/${waypointId}` : "/game/map"}
          className={cn(buttonVariants(), "mt-7 min-h-12 w-full rounded-xl bg-violet-600 font-black text-white hover:bg-violet-500")}
        >
          <MapIcon aria-hidden="true" /> {t("returnToJourney")}
        </Link>
      </section>
    </main>
  );
}
