import Image from "next/image";
import { useTranslations } from "next-intl";

/** Shared storefront header; the preview uses h2 to preserve its page hierarchy. */
export function OilShopHeader({
  isPreview = false,
  children,
}: {
  isPreview?: boolean;
  children: React.ReactNode;
}): React.ReactNode {
  const t = useTranslations("Shop");
  const Heading = isPreview ? "h2" : "h1";

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 overflow-hidden rounded-[2rem] border border-border bg-card p-4 text-card-foreground shadow-sm sm:grid-cols-[minmax(0,28rem)_12rem] sm:justify-start sm:gap-x-6 sm:px-6 sm:py-5">
      {/* Independent columns keep translated copy clear of Luna on mobile.
       * The cutout provides character while code owns every background color. */}
      <div className="min-w-0">
        <Heading className="font-heading text-3xl font-black leading-tight sm:text-5xl">
          {t("title")}
        </Heading>
        <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-lg">
          {t("subtitle")}
        </p>
      </div>
      <div className="relative row-span-1 aspect-square w-full sm:col-start-2 sm:row-span-2">
        <div aria-hidden="true" className="absolute inset-4 rounded-full bg-amber-400/10 blur-2xl dark:bg-amber-300/10" />
        <Image
          src="/images/oil-shop/luna-shopkeeper-cutout.png"
          alt={t("heroAlt")}
          fill
          className="object-contain"
          sizes="(min-width: 640px) 192px, 112px"
          preload={!isPreview}
        />
      </div>
      {/* Live balances share the purchase owner's state, so a successful purchase
       * updates this overview immediately without an extra database request. */}
      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-1 sm:row-start-2">
        {children}
      </div>
    </header>
  );
}
