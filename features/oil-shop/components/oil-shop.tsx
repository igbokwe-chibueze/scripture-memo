"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { GemIcon, GiftIcon, LightbulbIcon, PackageOpenIcon, ShoppingBagIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { purchaseShopItemAction } from "@/features/oil-shop/actions/purchase-shop-item.action";
import type { OilShopData, OilShopItem } from "@/features/oil-shop/types/oil-shop.types";

const itemArt: Record<number, string> = {
  1: "/images/oil-shop/single-spark.png",
  3: "/images/oil-shop/traveler-pack.png",
  5: "/images/oil-shop/lantern-pack.png",
};

type PurchaseCelebration = { item: OilShopItem; newHintBalance: number };

/** Returns approved game art for each server-defined hint quantity. */
function getItemArt(item: OilShopItem): string {
  return itemArt[item.hintQuantity] ?? "/images/oil-shop/single-spark.png";
}

/** Animated purchase acknowledgement that remains open until the learner closes it. */
function PurchaseCelebrationDialog({
  celebration,
  onClose,
}: {
  celebration: PurchaseCelebration | null;
  onClose: () => void;
}): React.ReactNode {
  return (
    <Dialog open={celebration !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden rounded-[2rem] border-2 border-violet-400/50 bg-[radial-gradient(circle_at_50%_22%,color-mix(in_oklch,var(--primary),transparent_70%),transparent_48%),linear-gradient(160deg,#17112d,#090817)] p-0 text-white sm:max-w-lg">
        {celebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.75, bounce: 0.28 }}
            className="relative px-5 pb-6 pt-9 text-center"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => (
                <motion.span
                  key={index}
                  className="absolute size-2 rotate-45 bg-amber-300"
                  style={{ left: `${8 + ((index * 17) % 84)}%`, top: `${12 + ((index * 23) % 62)}%` }}
                  animate={{ y: [0, -18, 8], rotate: [45, 160, 260], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.8, delay: index * 0.07, repeat: Infinity, repeatDelay: 0.5 }}
                />
              ))}
            </div>
            <p className="text-xs font-black tracking-[0.24em] text-amber-300 uppercase">Purchase complete</p>
            <h2 className="mt-2 font-heading text-4xl font-black">Trail supplied!</h2>
            <div className="relative mx-auto mt-3 h-64 max-w-sm">
              <Image src="/images/mascot/luna/luna-reward.png" alt="Luna celebrating your purchase" fill className="object-contain" sizes="384px" />
              <motion.div
                initial={{ x: 30, scale: 0.4, rotate: 12 }}
                animate={{ x: 0, scale: 1, rotate: -4 }}
                transition={{ type: "spring", delay: 0.3, duration: 0.8 }}
                className="absolute bottom-2 right-1 size-28 overflow-hidden rounded-3xl border-2 border-violet-300/70 shadow-[0_0_30px_rgb(168_85_247/0.5)]"
              >
                <Image src={getItemArt(celebration.item)} alt="" fill className="object-cover" sizes="112px" />
              </motion.div>
            </div>
            <div className="mx-auto grid max-w-sm grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-violet-300/25 bg-white/5 p-4 text-left">
              <div><p className="font-heading text-xl font-black">{celebration.item.name}</p><p className="text-sm text-violet-200">+{celebration.item.hintQuantity} hints</p></div>
              <div className="rounded-xl bg-violet-400/15 px-3 py-2 text-center"><LightbulbIcon className="mx-auto size-5 text-violet-300" /><strong>{celebration.newHintBalance}</strong></div>
            </div>
            <Button onClick={onClose} size="lg" className="mt-5 min-h-12 w-full bg-amber-400 text-base font-black text-slate-950 hover:bg-amber-300">Awesome!</Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Visual-first, tactile hint-pack storefront with server-owned purchase values. */
export function OilShop({ initialData }: { initialData: OilShopData }): React.ReactNode {
  const [data, setData] = useState(initialData);
  const [selected, setSelected] = useState<OilShopItem | null>(null);
  const [celebration, setCelebration] = useState<PurchaseCelebration | null>(null);
  const [activeTab, setActiveTab] = useState<"hints" | "donations">("hints");
  const [isPending, startTransition] = useTransition();

  function purchase(): void {
    if (!selected || isPending) return;
    const item = selected;
    startTransition(async () => {
      const result = await purchaseShopItemAction({ itemId: item.id, idempotencyKey: crypto.randomUUID() });
      if (!result.success || !result.data) {
        toast.error(result.message, { duration: Infinity });
        return;
      }
      setData((current) => ({ ...current, balance: result.data!.balance, hintsRemaining: result.data!.hintsRemaining, purchasedHints: result.data!.purchasedHints }));
      setSelected(null);
      setCelebration({ item, newHintBalance: result.data.hintsRemaining });
      toast.success(result.message);
    });
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3" aria-label="Oil Shop balances">
        <div className="rounded-3xl border border-amber-400/40 bg-slate-950/90 p-4 text-white shadow-[inset_0_0_20px_rgb(245_158_11/0.1)]">
          <GemIcon className="size-6 text-amber-300" aria-hidden="true" />
          <p className="mt-3 text-[0.65rem] font-black tracking-wider text-amber-300 uppercase">Glow balance</p>
          <p className="font-heading text-3xl font-black">{data.balance.toLocaleString()}</p>
        </div>
        <div className="rounded-3xl border border-violet-400/40 bg-slate-950/90 p-4 text-white shadow-[inset_0_0_20px_rgb(139_92_246/0.12)]">
          <LightbulbIcon className="size-6 text-violet-300" aria-hidden="true" />
          <p className="mt-3 text-[0.65rem] font-black tracking-wider text-violet-300 uppercase">Hints available</p>
          <p className="font-heading text-3xl font-black">{data.hintsRemaining}</p>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[2rem] border border-violet-400/30 bg-slate-950/95 text-white shadow-xl">
        <div className="grid grid-cols-2 border-b border-violet-300/20" role="tablist" aria-label="Shop categories">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "hints"}
            onClick={() => setActiveTab("hints")}
            className={`relative flex min-h-14 items-center justify-center gap-2 px-3 text-sm font-black transition-all ${activeTab === "hints" ? "z-10 -mb-px rounded-t-2xl bg-amber-500/15 text-amber-300 shadow-[inset_0_8px_18px_rgb(245_158_11/0.06),0_-5px_16px_rgb(245_158_11/0.08)]" : "border-r border-violet-300/15 text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <ShoppingBagIcon className="size-5" aria-hidden="true" /> Hint packs
            {activeTab === "hints" && <span className="absolute inset-x-5 bottom-0 h-1 rounded-t-full bg-amber-400 shadow-[0_0_12px_rgb(251_191_36/0.7)]" />}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "donations"}
            onClick={() => setActiveTab("donations")}
            className={`relative flex min-h-14 items-center justify-center gap-2 px-3 text-sm font-black transition-all ${activeTab === "donations" ? "z-10 -mb-px rounded-t-2xl bg-violet-500/15 text-violet-200 shadow-[inset_0_8px_18px_rgb(139_92_246/0.07),0_-5px_16px_rgb(139_92_246/0.1)]" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <GiftIcon className="size-5" aria-hidden="true" /> Donations
            {activeTab === "donations" && <span className="absolute inset-x-5 bottom-0 h-1 rounded-t-full bg-violet-400 shadow-[0_0_12px_rgb(167_139_250/0.7)]" />}
          </button>
        </div>
        {activeTab === "donations" ? (
          <div role="tabpanel" className="px-5 py-12 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-3xl border border-violet-300/25 bg-violet-400/10"><GiftIcon className="size-8 text-violet-300" aria-hidden="true" /></span>
            <h2 className="mt-4 font-heading text-2xl font-black">Donations coming later</h2>
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-10 text-center"><PackageOpenIcon className="mx-auto size-12 text-violet-300" /><h2 className="mt-4 font-heading text-2xl font-black">Shelves restocking</h2></div>
        ) : (
          <div role="tabpanel" className="space-y-3 p-3 sm:p-4">
            {data.items.map((item) => (
              <article key={item.id} className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] gap-2.5 overflow-hidden rounded-3xl border border-violet-300/20 bg-white/5 p-3 min-[390px]:grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                <button type="button" onClick={() => setSelected(item)} className="relative row-span-2 aspect-square min-w-0 overflow-hidden rounded-2xl border border-violet-400/50 transition-transform hover:scale-[1.03] active:scale-95 sm:row-span-1">
                  <Image src={getItemArt(item)} alt={item.name} fill className="object-cover" sizes="112px" />
                  <span className="absolute right-1 top-1 grid size-9 place-items-center rounded-full border-2 border-violet-200 bg-violet-700 font-black ring-2 ring-violet-950 shadow-[0_4px_0_rgb(67_20_122),0_7px_12px_rgb(0_0_0/0.45),0_0_16px_rgb(168_85_247/0.55)]">{item.hintQuantity}</span>
                </button>
                <button type="button" onClick={() => setSelected(item)} className="min-w-0 self-end overflow-hidden text-left sm:self-center">
                  <h2 className="text-wrap font-heading text-base font-black leading-tight min-[390px]:text-lg sm:text-xl">{item.name}</h2>
                  <p className="mt-1 line-clamp-2 text-xs text-violet-200 sm:text-sm">{item.description}</p>
                </button>
                <div className="col-start-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:col-start-3 sm:flex sm:flex-col sm:items-stretch">
                  <span className="inline-flex min-h-9 min-w-0 items-center justify-center gap-1 rounded-xl bg-black/30 px-2 font-black text-amber-300"><GemIcon className="size-4" />{item.cost}</span>
                  <Button onClick={() => setSelected(item)} className="min-h-10 bg-amber-400 px-3 font-black text-slate-950 hover:bg-amber-300 sm:px-5">View</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && !isPending && setSelected(null)}>
        <DialogContent className="overflow-hidden rounded-[2rem] border-2 border-violet-400/50 bg-linear-to-b from-[#211335] to-[#090817] p-5 text-white sm:max-w-md">
          {selected && <>
            <DialogHeader className="items-center text-center">
              <div className="relative mt-3 aspect-square w-52 overflow-hidden rounded-[2rem] border-2 border-violet-400/60 shadow-[0_0_35px_rgb(168_85_247/0.3)]"><Image src={getItemArt(selected)} alt={selected.name} fill className="object-cover" sizes="208px" /><span className="absolute right-3 top-3 grid size-12 place-items-center rounded-full border-[3px] border-violet-200 bg-violet-700 text-xl font-black ring-[3px] ring-violet-950 shadow-[0_5px_0_rgb(67_20_122),0_9px_16px_rgb(0_0_0/0.5),0_0_20px_rgb(168_85_247/0.6)]">{selected.hintQuantity}</span></div>
              <DialogTitle className="mt-4 font-heading text-3xl font-black">{selected.name}</DialogTitle>
              <DialogDescription className="max-w-xs text-base text-violet-200">{selected.description}</DialogDescription>
            </DialogHeader>
            <div className="mt-2 grid grid-cols-[1fr_1.25fr] gap-3 rounded-2xl border border-violet-300/25 bg-black/20 p-3">
              <span className="flex items-center justify-center gap-2 text-xl font-black text-amber-300"><GemIcon />{selected.cost}</span>
              <Button size="lg" className="min-h-12 bg-amber-400 text-base font-black text-slate-950 hover:bg-amber-300" disabled={isPending || data.balance < selected.cost} onClick={purchase}><SparklesIcon />{isPending ? "Purchasing…" : data.balance < selected.cost ? "More Glow needed" : "Buy"}</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
      <PurchaseCelebrationDialog celebration={celebration} onClose={() => setCelebration(null)} />
    </>
  );
}
