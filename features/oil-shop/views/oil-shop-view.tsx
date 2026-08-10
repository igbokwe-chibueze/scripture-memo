import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import Image from "next/image";
import { requireServerSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OilShop } from "@/features/oil-shop/components/oil-shop";
import { oilShopRepository } from "@/features/oil-shop/repositories/oil-shop.repository";

export const metadata: Metadata = {
  title: "Oil Shop | Scripture Memo",
  description: "Spend earned Glow Points on helpful supplies for your Scripture journey.",
  robots: { index: false, follow: false },
};

type OilShopSearchParameters = {
  tab?: string;
};

/** Loads the authenticated learner's private marketplace and balances. */
export async function OilShopView({
  searchParams,
}: {
  searchParams: Promise<OilShopSearchParameters>;
}): Promise<React.ReactNode> {
  const t = await getTranslations("Shop");
  const session = await requireServerSession();
  const [data, parameters] = await Promise.all([
    oilShopRepository.getShopData(session.user.id),
    searchParams,
  ]);
  const initialTab = parameters.tab === "donations" ? "donations" : "hints";

  return (
    <main className="min-h-dvh bg-linear-to-b from-violet-100 via-background to-amber-100/60 px-4 py-6 dark:from-[#120b25] dark:via-[#070913] dark:to-[#160d09] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/game" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-11 gap-2 rounded-xl px-4 font-black")}>
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> {t("journeyHome")}
        </Link>
        <header className="relative my-6 min-h-64 overflow-hidden rounded-[2rem] border border-violet-400/40 bg-slate-950 text-white shadow-2xl sm:min-h-80">
          <Image src="/images/oil-shop/luna-shopkeeper-hero.png" alt={t("heroAlt")} fill priority className="object-cover object-[64%_center] sm:object-center" sizes="(max-width: 1024px) 100vw, 1024px" />
          <div className="absolute inset-0 bg-linear-to-r from-[#090817] via-[#090817]/80 to-transparent" />
          <div className="relative flex min-h-64 max-w-[62%] flex-col justify-center p-4 min-[390px]:max-w-[58%] min-[390px]:p-6 sm:min-h-80 sm:max-w-[52%] sm:p-9">
            <p className="whitespace-nowrap text-[0.65rem] font-black tracking-[0.17em] text-amber-300 uppercase min-[390px]:text-xs min-[390px]:tracking-[0.2em]">{t("trailSupplies")}</p>
            <h1 className="mt-2 whitespace-nowrap font-heading text-3xl font-black min-[390px]:text-4xl sm:text-6xl">{t("title")}</h1>
            <p className="mt-3 whitespace-nowrap text-xs font-bold text-violet-100 min-[390px]:text-sm sm:text-lg">{t("subtitle")}</p>
          </div>
        </header>
        <OilShop initialData={data} initialTab={initialTab} />
      </div>
    </main>
  );
}
