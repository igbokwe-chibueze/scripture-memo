/** Client-only shop UI shared with isolated QA; the caller owns persistence. */

import Image from "next/image";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { useDesktopContextRail } from "@/components/shared/desktop-context-rail";
import { OilShopHeader } from "./oil-shop-header";
import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import {
  GemIcon,
  GiftIcon,
  LightbulbIcon,
  PackageOpenIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import type { OilShopTransport } from "../types/oil-shop-transport.types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OilShopData, OilShopItem } from "@/features/oil-shop/types/oil-shop.types";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";

// Transparent objects deliberately contain no card scenery; surfaces use theme tokens.
const itemArt: Record<number, string> = {
  1: "/images/oil-shop/single-spark-cutout.png",
  3: "/images/oil-shop/traveler-pack-cutout.png",
  5: "/images/oil-shop/lantern-pack-cutout.png",
};

export type PurchaseCelebration = {
  item: OilShopItem;
  previousHintBalance: number;
  newHintBalance: number;
};

/** Counts one trusted purchased-hint balance after the earlier effects settle. */
function PurchasedHintBalance({
  previousValue,
  newValue,
  reducedMotion,
}: {
  previousValue: number;
  newValue: number;
  reducedMotion: boolean;
}): React.ReactNode {
  const [displayedValue, setDisplayedValue] = useState(previousValue);

  useEffect(() => {
    // Reduced motion resolves the trusted result directly during render. Do not
    // schedule the normal 1.5-second animation delay or a follow-up state write.
    if (reducedMotion) return;

    let animationFrame = 0;
    // WHY: The balance is deliberately the final celebration beat. Waiting for
    // the modal, Luna, particles, and item to settle prevents competing motion.
    const startTimer = window.setTimeout(() => {
      const startedAt = performance.now();
      const durationMs = 850;
      const step = (timestamp: number): void => {
        const progress = Math.min(1, (timestamp - startedAt) / durationMs);
        setDisplayedValue(Math.floor(previousValue + (newValue - previousValue) * progress));
        if (progress < 1) animationFrame = window.requestAnimationFrame(step);
      };
      animationFrame = window.requestAnimationFrame(step);
    }, 1_500);
    return () => {
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [newValue, previousValue, reducedMotion]);

  return (
    <motion.div
      key={reducedMotion ? newValue : displayedValue}
      initial={reducedMotion ? false : { scale: 0.94 }}
      animate={{ scale: 1 }}
      className="rounded-xl bg-muted px-3 py-2 text-center text-foreground"
    >
      <LightbulbIcon className="mx-auto size-5 text-violet-700 dark:text-violet-300" />
      <strong>{reducedMotion ? newValue : displayedValue}</strong>
    </motion.div>
  );
}

/** Returns approved game art for each server-defined hint quantity. */
function getItemArt(item: OilShopItem): string {
  return itemArt[item.hintQuantity] ?? "/images/oil-shop/single-spark-cutout.png";
}

/** Animated purchase acknowledgement that remains open until the learner closes it. */
export function PurchaseCelebrationDialog({
  celebration,
  onClose,
}: {
  celebration: PurchaseCelebration | null;
  onClose: () => void;
}): React.ReactNode {
  const t = useTranslations("Shop");
  const common = useTranslations("Common");
  const playAudio = useAudioFeedback();
  const shouldReduceMotion = useReducedMotionPreference();

  useEffect(() => {
    if (celebration) playAudio("shop-purchase");
  }, [celebration, playAudio]);

  return (
    <Dialog open={celebration !== null} onOpenChange={(open) => !open && onClose()}>
      {/* The celebration inherits the same light/dark card palette as the shop;
       * Luna, warm reward effects, and motion provide the celebratory identity. */}
      <DialogContent
        showCloseButton={false}
        className="h-[calc(100dvh-1rem)] max-h-[46rem] overflow-hidden rounded-[2rem] border-2 border-border bg-card p-0 text-card-foreground sm:max-w-lg"
      >
        {celebration && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", duration: 0.75, bounce: 0.28 }
            }
            className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 px-4 pb-4 pt-5 text-center min-[390px]:px-5 min-[390px]:pb-5 min-[390px]:pt-7"
          >
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={onClose}
              aria-label={common("close")}
              className="absolute right-3 top-3 z-20 size-11 rounded-2xl"
            >
              <XIcon className="size-5" aria-hidden="true" />
            </Button>
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {!shouldReduceMotion && Array.from({ length: 12 }, (_, index) => (
                <motion.span
                  key={index}
                  className="absolute size-2 rotate-45 bg-amber-300"
                  style={{ left: `${8 + ((index * 17) % 84)}%`, top: `${12 + ((index * 23) % 62)}%` }}
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          y: [0, -18, 8],
                          rotate: [45, 160, 260],
                          opacity: [0, 1, 0],
                        }
                  }
                  transition={{ duration: 1.8, delay: index * 0.07, repeat: Infinity, repeatDelay: 0.5 }}
                />
              ))}
            </div>
            <div className="px-12">
              <p className="text-[0.6rem] font-bold tracking-[0.2em] text-amber-700 uppercase min-[390px]:text-xs dark:text-amber-300">
                {t("purchaseComplete")}
              </p>
              <h2 className="mt-1 font-heading text-3xl font-bold min-[390px]:text-4xl">
                {t("trailSupplied")}
              </h2>
            </div>
            <div className="relative mx-auto h-full min-h-0 w-full max-w-sm">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <motion.div
                  className="absolute left-1/2 top-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 bg-[repeating-conic-gradient(from_0deg,transparent_0deg_11deg,rgb(251_191_36/0.12)_11deg_17deg,transparent_17deg_30deg)] [mask-image:radial-gradient(circle,black_0%,rgb(0_0_0/0.88)_34%,rgb(0_0_0/0.38)_62%,transparent_88%)]"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { rotate: 360, scale: [0.98, 1.04, 0.98] }
                  }
                  transition={{ rotate: { duration: 28, repeat: Infinity, ease: "linear" }, scale: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } }}
                />
                <div className="absolute left-1/2 top-1/2 size-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/18 blur-[3.5rem]" />
              </div>
              <Image src="/images/mascot/luna/luna-reward.png" alt={t("celebrationAlt")} fill className="z-10 object-contain" sizes="384px" />
              <motion.div
                initial={
                  shouldReduceMotion
                    ? false
                    : { x: 30, scale: 0.4, rotate: 12 }
                }
                animate={{ x: 0, scale: 1, rotate: -4 }}
                transition={{ type: "spring", delay: 0.3, duration: 0.8 }}
                className="absolute bottom-1 right-1 z-20 size-24 overflow-hidden rounded-3xl border-2 border-border bg-muted shadow-lg min-[390px]:size-28"
              >
                <Image

                  src={getItemArt(celebration.item)}

                  alt=""

                  fill

                  className="object-contain p-2"

                  sizes="112px"

                />
              </motion.div>
            </div>
            <div className="mx-auto grid w-full max-w-sm grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left text-foreground min-[390px]:p-4">
              <div>
                <p className="font-heading text-lg font-bold min-[390px]:text-xl">
                  {celebration.item.name}
                </p>
                <p className="text-xs text-muted-foreground min-[390px]:text-sm">
                  {t("receivedHints", { count: celebration.item.hintQuantity })}
                </p>
              </div>
              <PurchasedHintBalance
                previousValue={celebration.previousHintBalance}
                newValue={celebration.newHintBalance}
                reducedMotion={shouldReduceMotion}
              />
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Visual-first, tactile hint-pack storefront with server-owned purchase values. */
export function OilShopContent({
  initialData,
  transport,
  initialTab = "hints",
  isAdministrator = false,
  isPreview = false,
}: {
  initialData: OilShopData;
  transport: OilShopTransport;
  initialTab?: "hints" | "donations";
  isAdministrator?: boolean;
  isPreview?: boolean;
}): React.ReactNode {
  const t = useTranslations("Shop");
  const common = useTranslations("Common");
  const locale = useLocale();
  const rail = useDesktopContextRail();
  const [data, setData] = useState(initialData);
  const [selected, setSelected] = useState<OilShopItem | null>(initialData.items[0] ?? null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [celebration, setCelebration] = useState<PurchaseCelebration | null>(null);
  const [activeTab, setActiveTab] =
    useState<"hints" | "donations">(initialTab);
  const [isPending, startTransition] = useTransition();
  const [qaCheck, setQaCheck] = useState<"purchase" | "balance" | null>(null);
  const [isQaPending, startQaTransition] = useTransition();

  /** Selects the desktop detail card or opens the compact-screen modal. */
  function previewItem(item: OilShopItem): void {
    setSelected(item);
    if (!window.matchMedia("(min-width: 1280px)").matches) {
      setMobilePreviewOpen(true);
    }
  }

  function purchase(): void {
    if (!selected || isPending) return;
    const item = selected;
    const previousHintBalance = data.hintsRemaining;
    startTransition(async () => {
      const result = await transport.purchase({ itemId: item.id, idempotencyKey: crypto.randomUUID() });
      if (!result.success || !result.data) {
        toast.error(result.message, { duration: Infinity });
        return;
      }
      setData((current) => ({ ...current, balance: result.data!.balance, hintsRemaining: result.data!.hintsRemaining, purchasedHints: result.data!.purchasedHints }));
      setMobilePreviewOpen(false);
      setCelebration({ item, previousHintBalance, newHintBalance: result.data.hintsRemaining });
      toast.success(result.message);
    });
  }

  /** Runs one administrator-only shop diagnostic with visible pending feedback. */
  function runQaCheck(check: "purchase" | "balance"): void {
    if (isQaPending) return;

    setQaCheck(check);
    startQaTransition(async () => {
      const result =
        check === "purchase"
          ? await transport.verifyPurchase()
          : await transport.verifyBalance();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message, { duration: Infinity });
      }
      setQaCheck(null);
    });
  }

  // Keep the rail free of nested scrolling. Flexible artwork gives space back
  // to the name, description, and purchase controls on shorter windows.
  const detailPanel = (
      <aside className="flex h-full min-h-0 flex-col p-3 text-card-foreground" aria-label={t("selectedItem")}>
        {activeTab === "donations" ? (
          <div className="grid min-h-48 place-items-center text-center">
            <div><span className="mx-auto grid size-20 place-items-center rounded-3xl bg-muted"><GiftIcon className="size-10 text-violet-700 dark:text-violet-300" /></span><h2 className="mt-5 font-heading text-2xl font-bold">{t("donationsSoon")}</h2></div>
          </div>
        ) : selected ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="relative mx-auto max-h-36 min-h-0 w-full max-w-36 flex-1 basis-36 overflow-hidden rounded-2xl bg-muted">
              <Image
                src={getItemArt(selected)}
                alt={selected.name}
                fill
                className="object-contain p-2"
                sizes="144px"
              />
              <span className="absolute right-1 top-1 grid size-8 place-items-center rounded-full border-[3px] border-card bg-primary text-primary-foreground text-sm font-bold ring-[3px] ring-border shadow-sm">{selected.hintQuantity}</span>
            </div>
            <h2 className="shrink-0 font-heading text-lg font-bold leading-tight">{selected.name}</h2>
            <p className="shrink-0 text-sm leading-snug text-muted-foreground">{selected.description}</p>
            <div className="grid shrink-0 gap-2 rounded-2xl border border-border bg-muted/50 p-2">
              <span className="flex items-center justify-center gap-2 text-xl font-bold text-amber-700 dark:text-amber-300"><GemIcon />{selected.cost}</span>
              <LoadingButton
                size="lg"
                className="min-h-11 text-sm font-bold"
                isPending={isPending}
                pendingLabel={t("purchasing")}
                disabled={data.balance < selected.cost}
                onClick={purchase}
              >
                <SparklesIcon />
                {data.balance < selected.cost ? t("moreGlow") : t("buy")}
              </LoadingButton>
            </div>
          </div>
        ) : null}
      </aside>
  );

  return (
    <>
      {/* Storefront surfaces inherit the application theme. Artwork and small
       * currency accents provide identity without forcing a separate dark UI. */}
      <OilShopHeader isPreview={isPreview}>
        <section className="grid grid-cols-2 gap-2" aria-label={t("balances")}>
          <div className="min-w-0 rounded-2xl border border-border bg-muted/50 p-3 text-card-foreground">
            <GemIcon className="size-6 text-amber-700 dark:text-amber-300" aria-hidden="true" />
            <p className="mt-1 text-[0.65rem] font-bold tracking-wider text-amber-700 uppercase dark:text-amber-300">
              {t("glowBalance")}
            </p>
            <p className="break-all font-heading text-2xl font-bold">
              {data.balance.toLocaleString(locale)}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-border bg-muted/50 p-3 text-card-foreground">
            <LightbulbIcon className="size-6 text-violet-700 dark:text-violet-300" aria-hidden="true" />
            <p className="mt-1 text-[0.65rem] font-bold tracking-wider text-violet-700 uppercase dark:text-violet-300">
              {t("hintsAvailable")}
            </p>
            <p className="break-all font-heading text-2xl font-bold">{data.hintsRemaining.toLocaleString(locale)}</p>
          </div>
        </section>
      </OilShopHeader>

      {isAdministrator && (
        <section className="mt-4 rounded-2xl border border-sky-400/35 bg-sky-500/10 p-3 text-sky-950 dark:text-sky-100">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheckIcon className="size-5" aria-hidden="true" />
            <h2>Admin testing</h2>
          </div>
          <div className="mt-3 grid gap-2 min-[390px]:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={isQaPending}
              onClick={() => runQaCheck("purchase")}
            >
              {isQaPending && qaCheck === "purchase"
                ? "Verifying…"
                : "Verify latest purchase"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isQaPending}
              onClick={() => runQaCheck("balance")}
            >
              {isQaPending && qaCheck === "balance"
                ? "Verifying…"
                : "Verify balance guard"}
            </Button>
          </div>
        </section>
      )}

      <GamePageColumns className="mt-5" contextPanel={rail ? detailPanel : undefined}>
        <div className={rail ? "" : "xl:grid xl:grid-cols-[minmax(0,1fr)_16rem] xl:items-start xl:gap-5"}>
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card text-card-foreground shadow-sm">
          <div className="grid grid-cols-2 border-b border-border" role="tablist" aria-label={t("categories")}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "hints"}
              onClick={() => setActiveTab("hints")}
              className={`relative flex min-h-14 items-center justify-center gap-2 px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${activeTab === "hints" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <ShoppingBagIcon className="size-5" aria-hidden="true" /> {t("hintPacks")}
              {activeTab === "hints" && <span className="absolute inset-x-5 bottom-0 h-1 rounded-t-full bg-primary" />}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "donations"}
              onClick={() => setActiveTab("donations")}
              className={`relative flex min-h-14 items-center justify-center gap-2 px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${activeTab === "donations" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <GiftIcon className="size-5" aria-hidden="true" /> {t("donations")}
              {activeTab === "donations" && <span className="absolute inset-x-5 bottom-0 h-1 rounded-t-full bg-primary" />}
            </button>
          </div>
          {activeTab === "donations" ? (
            <div role="tabpanel" className="px-5 py-12 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-3xl border border-border bg-muted"><GiftIcon className="size-8 text-violet-700 dark:text-violet-300" aria-hidden="true" /></span>
              <h2 className="mt-4 font-heading text-2xl font-bold">{t("donationsSoon")}</h2>
            </div>
          ) : data.items.length === 0 ? (
            <div className="p-10 text-center"><PackageOpenIcon className="mx-auto size-12 text-violet-700 dark:text-violet-300" /><h2 className="mt-4 font-heading text-2xl font-bold">{t("restocking")}</h2></div>
          ) : (
            <div role="tabpanel" className="space-y-3 p-3 sm:p-4">
              {data.items.map((item) => (
                <article
                  key={item.id}
                  className={`grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] gap-2.5 overflow-hidden rounded-3xl border border-border bg-muted/40 p-3 min-[390px]:grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3 ${selected?.id === item.id ? "ring-1 ring-primary/40" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => previewItem(item)}
                    className="relative row-span-2 aspect-square min-w-0 overflow-hidden rounded-2xl border border-border bg-muted transition-transform hover:scale-[1.03] active:scale-95 sm:row-span-1"
                  >
                    <Image
                      src={getItemArt(item)}
                      alt={item.name}
                      fill
                      className="object-contain p-2"
                      sizes="112px"
                    />
                    <span className="absolute right-1 top-1 grid size-9 place-items-center rounded-full border-2 border-card bg-primary font-bold text-primary-foreground ring-2 ring-border shadow-sm">
                      {item.hintQuantity}
                    </span>
                  </button>
                  <button type="button" onClick={() => previewItem(item)} className="min-w-0 self-end overflow-hidden text-left sm:self-center">
                    <h2 className="text-wrap font-heading text-base font-bold leading-tight min-[390px]:text-lg sm:text-xl">{item.name}</h2>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                      {item.description}
                    </p>
                  </button>
                  <div className="col-start-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:col-start-3 sm:flex sm:flex-col sm:items-stretch">
                    <span className="inline-flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-xl bg-muted px-2 font-bold text-amber-700 dark:text-amber-300"><GemIcon className="size-4" />{item.cost}</span>
                    <Button
                      onClick={() => previewItem(item)}
                      variant={selected?.id === item.id ? "default" : "outline"}
                      aria-pressed={selected?.id === item.id}
                      className="min-h-11 px-3 font-bold sm:px-5"
                    >
                      {common("view")}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {!rail && (
          <div className="sticky top-6 hidden h-96 rounded-3xl border border-border bg-card xl:block">
            {detailPanel}
          </div>
        )}
        </div>
      </GamePageColumns>

      <Dialog open={mobilePreviewOpen && selected !== null} onOpenChange={(open) => !open && !isPending && setMobilePreviewOpen(false)}>
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden rounded-[2rem] border border-border bg-card p-5 text-card-foreground sm:max-w-md"
        >
          {selected && <>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={() => !isPending && setMobilePreviewOpen(false)}
              disabled={isPending}
              aria-label={common("close")}
              className="absolute right-3 top-3 z-20 size-11 rounded-2xl"
            >
              <XIcon className="size-5" aria-hidden="true" />
            </Button>
            <DialogHeader className="items-center text-center">
              <div className="relative mt-3 aspect-square w-52 overflow-hidden rounded-[2rem] border-2 border-border bg-muted shadow-sm">
                <Image
                  src={getItemArt(selected)}
                  alt={selected.name}
                  fill
                  className="object-contain p-2"
                  sizes="208px"
                />
                <span className="absolute right-3 top-3 grid size-12 place-items-center rounded-full border-[3px] border-card bg-primary text-primary-foreground text-xl font-bold ring-[3px] ring-border shadow-sm">
                  {selected.hintQuantity}
                </span>
              </div>
              <DialogTitle className="mt-4 font-heading text-3xl font-bold">{selected.name}</DialogTitle>
              <DialogDescription className="max-w-xs text-base text-muted-foreground">{selected.description}</DialogDescription>
            </DialogHeader>
            <div className="mt-2 grid grid-cols-[1fr_1.25fr] gap-3 rounded-2xl border border-border bg-muted/50 p-3">
              <span className="flex items-center justify-center gap-2 text-xl font-bold text-amber-700 dark:text-amber-300"><GemIcon />{selected.cost}</span>
              <LoadingButton
                size="lg"
                className="min-h-12 text-base font-bold"
                isPending={isPending}
                pendingLabel={t("purchasing")}
                disabled={data.balance < selected.cost}
                onClick={purchase}
              >
                <SparklesIcon />
                {data.balance < selected.cost ? t("moreGlowNeeded") : t("buy")}
              </LoadingButton>
            </div>
          </>}
        </DialogContent>
      </Dialog>
      <PurchaseCelebrationDialog celebration={celebration} onClose={() => setCelebration(null)} />
    </>
  );
}
