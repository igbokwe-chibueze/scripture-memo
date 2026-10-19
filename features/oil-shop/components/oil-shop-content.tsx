/** Storefront composition shared with isolated QA; production binds server actions. */
import { useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { GlowGem } from "@/components/shared/game-artwork";
import { NavigationButton } from "@/components/shared/navigation-button";
import { LoadingButton } from "@/components/shared/loading-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showActionError } from "@/lib/errors/show-action-error";
import { OilShopHeader } from "./oil-shop-header";
import { ShopAvatarGrid } from "./shop-avatar-grid";
import { HintPackArtwork } from "./hint-pack-artwork";
import { getAvatarCollection } from "../lib/avatar-collection";
import { createPurchaseRequestKey } from "../lib/purchase-request-key";
import { PurchaseCelebrationDialog, type PurchaseCelebration } from "./purchase-celebration-dialog";
import type { OilShopData, OilShopItem, OilShopPurchaseResult } from "../types/oil-shop.types";
import type { OilShopTransport } from "../types/oil-shop-transport.types";
import styles from "./shop-screen.module.css";

// Preserve the public celebration API used by existing admin QA previews.
export { PurchaseCelebrationDialog } from "./purchase-celebration-dialog";
export type { PurchaseCelebration } from "./purchase-celebration-dialog";

/** All prices and entitlements come from the authorized DTO and mutation result. */
export function OilShopContent({
  initialData,
  transport,
  initialTab = "hints",
  isAdministrator = false,
  isPreview = false,
}: {
  initialData: OilShopData;
  transport: OilShopTransport;
  initialTab?: "hints" | "avatars" | "donations";
  isAdministrator?: boolean;
  isPreview?: boolean;
}): React.ReactNode {
  const t = useTranslations("Shop");
  const partner = useTranslations("PartnerSupport");
  const locale = useLocale();
  const [data, setData] = useState(initialData);
  const [selected, setSelected] = useState<OilShopItem | null>(null);
  const [celebration, setCelebration] = useState<PurchaseCelebration | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isQaPending, startQaTransition] = useTransition();
  const requestKey = useRef("");

  /** Localize the four first-party offers while preserving any custom item name. */
  function packName(item: OilShopItem): string {
    return [3, 10, 25, 50].includes(item.hintQuantity)
      ? t(`packNames.${item.hintQuantity}`) : item.name;
  }

  /** Update both inventories from trusted results, keeping the displayed balance exact. */
  function acceptPurchase(result: OilShopPurchaseResult): void {
    if (result.avatarKey) {
      setCelebration({
        kind: "avatar",
        avatarKey: result.avatarKey,
        collection: getAvatarCollection(result.ownedAvatarKeys ?? data.ownedAvatarKeys, result.avatarKey),
      });
    }
    setData((current) => ({
      ...current,
      balance: result.balance,
      hintsRemaining: result.hintsRemaining,
      purchasedHints: result.purchasedHints,
      ownedAvatarKeys: result.ownedAvatarKeys ?? (result.avatarKey
        ? [...new Set([...current.ownedAvatarKeys, result.avatarKey])]
        : current.ownedAvatarKeys),
      avatars: current.avatars.map((avatar) => (
        avatar.avatarKey === result.avatarKey ? { ...avatar, owned: true } : avatar
      )),
    }));
  }

  function previewPack(item: OilShopItem): void {
    requestKey.current = createPurchaseRequestKey();
    setSelected(item);
  }

  /** Stable request keys protect retries; failure leaves the preview and balance intact. */
  function purchase(): void {
    if (!selected || isPending) return;
    const item = selected;
    startTransition(async () => {
      try {
        const result = await transport.purchase({
          itemId: item.id,
          idempotencyKey: requestKey.current,
        });
        if (!result.success) return showActionError(result);
        if (!result.data) return;
        const acknowledgedItem = {
          ...item,
          hintQuantity: result.data.hintQuantity ?? item.hintQuantity,
        };
        acceptPurchase(result.data);
        setSelected(null);
        // Keep the receipt arithmetic aligned with the acknowledged balance,
        // even if this tab's pre-request balance was stale from another device.
        setCelebration({
          item: acknowledgedItem,
          previousHintBalance: Math.max(0, result.data.hintsRemaining - acknowledgedItem.hintQuantity),
          newHintBalance: result.data.hintsRemaining,
        });
        toast.success(result.message);
      } catch {
        toast.error(t("requestFailed"), { duration: Infinity });
      }
    });
  }

  /** Existing administrator diagnostics stay explicit, never automatic on shop reads. */
  function runQa(check: "purchase" | "balance"): void {
    startQaTransition(async () => {
      try {
        const result = check === "purchase" ? await transport.verifyPurchase() : await transport.verifyBalance();
        if (!result.success) return showActionError(result);
        toast.success(result.message);
      } catch {
        toast.error(t("requestFailed"), { duration: Infinity });
      }
    });
  }

  const context = (
    <aside className={styles.panel}>
      <h2>{t("hintsAvailable")}</h2>
      <strong>{data.hintsRemaining.toLocaleString(locale)}</strong>
      <p>{t("hintGuidance")}</p>
      <p>{t("avatarGuidance")}</p>
    </aside>
  );

  return (
    <GamePageColumns contextPanel={context}>
      <OilShopHeader isPreview={isPreview}>
        <div className={styles.balance}>
          <GlowGem className="size-8 shrink-0 sm:size-11" />
          <div>
            <strong>{data.balance.toLocaleString(locale)}</strong>
            <span>{t("glowPoints")}</span>
          </div>
        </div>
      </OilShopHeader>
      <Tabs defaultValue={initialTab}>
        <TabsList className="grid min-h-12 w-full grid-cols-3">
          <TabsTrigger value="hints" className={`${styles.tab} min-h-11 text-xs sm:text-sm`}>
            {t("hintPacks")}
          </TabsTrigger>
          <TabsTrigger value="avatars" className={`${styles.tab} min-h-11 text-xs sm:text-sm`}>
            {t("avatars")}
          </TabsTrigger>
          <TabsTrigger value="donations" className={`${styles.tab} min-h-11 text-xs sm:text-sm`}>
            {t("donations")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="hints" className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("hintPacks")}</h2>
          <p className={styles.sectionCopy}>{t("hintDescription")}</p>
          <p className="mb-3 text-sm text-muted-foreground xl:hidden">
            {t("hintsAvailable")}: {data.hintsRemaining.toLocaleString(locale)}
          </p>
          {data.items.length === 0 ? (
            <EmptyState title={t("restocking")} description={t("hintDescription")} />
          ) : (
            <div className={styles.grid}>
              {data.items.map((item) => (
                <article key={item.id} className={styles.card}>
                  <HintPackArtwork quantity={item.hintQuantity} />
                  <h3 className={styles.cardTitle}>
                    {packName(item)}
                  </h3>
                  <p className={styles.quantity}>{t("hintCount", { count: item.hintQuantity })}</p>
                  <div className={styles.actions}>
                    <span className={styles.price}>
                      <GlowGem className="size-5 sm:size-6" />
                      {item.cost.toLocaleString(locale)}
                    </span>
                    <Button
                      variant={data.balance >= item.cost ? "default" : "secondary"}
                      onClick={() => previewPack(item)}
                      aria-label={t("viewPack", { name: packName(item) })}
                    >
                      {t("viewPackButton")}
                    </Button>
                  </div>
                  {data.balance < item.cost && (
                    <p className={styles.need}>{t("needMore", { count: item.cost - data.balance })}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="avatars" className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("avatars")}</h2>
          <p className={styles.sectionCopy}>{t("avatarDescription")}</p>
          <ShopAvatarGrid
            data={data}
            transport={transport}
            onPurchased={acceptPurchase}
            onEquipped={(key) => setData((current) => ({ ...current, equippedAvatarKey: key }))}
          />
        </TabsContent>
        <TabsContent value="donations" className={styles.section}>
          <EmptyState
            title={t("donationsSoon")}
            description={t("donationDescription")}
            action={(
              <NavigationButton
                href="/partner"
                target="_blank"
                rel="noopener noreferrer"
                pendingLabel={partner("opening")}
                className="min-h-11"
              >
                {t("supportJourney")}
              </NavigationButton>
            )}
          />
        </TabsContent>
      </Tabs>
      {isAdministrator && (
        <section className="mt-6 rounded-control border border-border p-3">
          <h2 className="font-heading text-lg font-bold">Admin testing</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <LoadingButton
              isPending={isQaPending}
              pendingLabel="Verifying"
              variant="secondary"
              onClick={() => runQa("purchase")}
              className="min-h-11"
            >
              Verify latest hint purchase
            </LoadingButton>
            <LoadingButton
              isPending={isQaPending}
              pendingLabel="Verifying"
              variant="secondary"
              onClick={() => runQa("balance")}
              className="min-h-11"
            >
              Verify balance guard
            </LoadingButton>
          </div>
        </section>
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && !isPending && setSelected(null)}
      >
        <DialogContent showCloseButton={!isPending} className="max-h-[90dvh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader className={styles.previewHeader}>
                <DialogTitle>{packName(selected)}</DialogTitle>
                <DialogDescription>{t("hintDescription")}</DialogDescription>
              </DialogHeader>
              <HintPackArtwork quantity={selected.hintQuantity} />
              <p className={`${styles.quantity} text-center`}>{t("hintCount", { count: selected.hintQuantity })}</p>
              <span className={styles.price}>
                <GlowGem className="size-7" />
                {selected.cost.toLocaleString(locale)}
              </span>
              <LoadingButton
                isPending={isPending}
                pendingLabel={t("purchasing")}
                disabled={data.balance < selected.cost}
                onClick={purchase}
                className="min-h-11"
              >
                {t("buy")}
              </LoadingButton>
              {data.balance < selected.cost && (
                <p className="text-center text-sm text-muted-foreground">
                  {t("needMore", { count: selected.cost - data.balance })}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <PurchaseCelebrationDialog
        celebration={celebration}
        onClose={() => setCelebration(null)}
      />
    </GamePageColumns>
  );
}
