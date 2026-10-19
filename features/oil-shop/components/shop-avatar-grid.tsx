/** Cosmetic preview/equip controls share the authorized catalogue and live balance. */
import Image from "next/image";
import { useState, useTransition, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import { GlowGem } from "@/components/shared/game-artwork";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { showActionError } from "@/lib/errors/show-action-error";
import type { AvatarKey } from "@/features/profile/data/avatar-catalog";
import type { OilShopData, OilShopPurchaseResult, ShopAvatarItem } from "../types/oil-shop.types";
import type { OilShopTransport } from "../types/oil-shop-transport.types";
import styles from "./shop-screen.module.css";

/** Owned portraits equip without charging; previews stay usable when balance is low. */
export function ShopAvatarGrid({
  data,
  transport,
  onPurchased,
  onEquipped,
}: {
  data: OilShopData;
  transport: OilShopTransport;
  onPurchased: (result: OilShopPurchaseResult) => void;
  onEquipped: (key: AvatarKey) => void;
}): React.ReactNode {
  const t = useTranslations("Shop");
  const animals = useTranslations("Settings.animals");
  const locale = useLocale();
  const [selected, setSelected] = useState<ShopAvatarItem | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestKey = useRef("");

  /** Keep the same request key on a retry after uncertain transport failure. */
  function preview(item: ShopAvatarItem): void {
    requestKey.current = crypto.randomUUID();
    setSelected(item);
  }

  function equip(key: AvatarKey): void {
    setPendingKey(key);
    startTransition(async () => {
      try {
        const result = await transport.equipAvatar({ avatarKey: key });
        if (!result.success) return showActionError(result);
        onEquipped(key);
        toast.success(result.message);
      } catch {
        toast.error(t("requestFailed"), { duration: Infinity });
      }
    });
  }

  function purchase(): void {
    if (!selected || isPending) return;
    const item = selected;
    setPendingKey(item.avatarKey);
    startTransition(async () => {
      try {
        const result = await transport.purchase({
          itemId: item.id,
          idempotencyKey: requestKey.current,
        });
        if (!result.success) return showActionError(result);
        if (!result.data) return;
        onPurchased(result.data);
        setSelected(null);
        toast.success(result.message);
      } catch {
        toast.error(t("requestFailed"), { duration: Infinity });
      }
    });
  }

  return (
    <>
      {data.avatars.length === 0 ? (
        <EmptyState title={t("restocking")} description={t("avatarDescription")} />
      ) : (
        <div className={styles.grid}>
          {data.avatars.map((avatar) => {
            const equipped = avatar.avatarKey === data.equippedAvatarKey;
            return (
              <article key={avatar.id} className={styles.card} data-equipped={equipped}>
                <div className={styles.avatarArt}>
                  <Image
                    src={`/images/avatars/${avatar.avatarKey}.png`}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 40vw, 240px"
                  />
                </div>
                <h3 className={styles.cardTitle}>{animals(avatar.avatarKey)}</h3>
                <div className={`${styles.actions} mt-3`}>
                  {avatar.owned ? (
                    <>
                      {!equipped && <span className={styles.need}>{t("owned")}</span>}
                      <LoadingButton
                        isPending={isPending && pendingKey === avatar.avatarKey}
                        pendingLabel={t("equipping")}
                        disabled={equipped || isPending}
                        onClick={() => equip(avatar.avatarKey)}
                      >
                        {t(equipped ? "equipped" : "equip")}
                      </LoadingButton>
                    </>
                  ) : (
                    <>
                      <span className={styles.price}>
                        <GlowGem className="size-5" />
                        {avatar.cost.toLocaleString(locale)}
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => preview(avatar)}
                        disabled={isPending}
                      >
                        {t("preview")}
                      </Button>
                    </>
                  )}
                </div>
                {!avatar.owned && data.balance < avatar.cost && (
                  <p className={styles.need}>{t("needMore", { count: avatar.cost - data.balance })}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && !isPending && setSelected(null)}
      >
        <DialogContent showCloseButton={!isPending} className="max-h-[90dvh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader className={styles.previewHeader}>
                <DialogTitle>{animals(selected.avatarKey)}</DialogTitle>
                <DialogDescription>{t("permanentAvatar")}</DialogDescription>
              </DialogHeader>
              <div className="relative mx-auto size-48">
                <Image
                  src={`/images/avatars/${selected.avatarKey}.png`}
                  alt=""
                  fill
                  sizes="192px"
                  className="object-contain"
                />
              </div>
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
    </>
  );
}
