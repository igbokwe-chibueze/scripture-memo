"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { createFellowshipAction } from "@/features/fellowships/actions/create-fellowship.action";
import { FellowshipInsigniaPicker } from "@/features/fellowships/components/fellowship-insignia-picker";
import { DEFAULT_FELLOWSHIP_INSIGNIA, type FellowshipInsigniaKey } from "@/features/fellowships/constants/fellowship-insignias";
import { BadgeUnlockSequence } from "@/features/badges/components/badge-unlock-screen";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/shared/loading-button";

export function CreateFellowshipForm(): React.ReactNode {
  const t = useTranslations("Fellowships");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPublic, setIsPublic] = useState(true);
  const [insigniaKey, setInsigniaKey] = useState<FellowshipInsigniaKey>(DEFAULT_FELLOWSHIP_INSIGNIA);
  const [unlocks, setUnlocks] = useState<BadgeUnlockResult[]>([]);
  const [unlockIndex, setUnlockIndex] = useState(0);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const submit = (formData: FormData): void => startTransition(async () => {
    const result = await createFellowshipAction({ name: formData.get("name"), description: formData.get("description"), isPublic, insigniaKey });
    if (!result.success || !result.data) { toast.error(result.message, { duration: Infinity }); return; }
    toast.success(result.message); if (result.data.badgeUnlocks.length > 0) { setUnlocks(result.data.badgeUnlocks); setPendingSlug(result.data.slug); } else { router.push(`/fellowships/${result.data.slug}`); router.refresh(); }
  });
  return <><form action={submit} className="space-y-5 rounded-[2rem] border border-violet-300/25 bg-card p-5 shadow-xl sm:p-7"><label className="grid gap-2 font-bold">{t("name")}<Input name="name" required minLength={3} maxLength={50} /></label><label className="grid gap-2 font-bold">{t("descriptionLabel")}<Textarea name="description" maxLength={280} rows={5} /></label><FellowshipInsigniaPicker value={insigniaKey} onChange={setInsigniaKey} /><div className="flex items-center gap-4 rounded-2xl border p-4"><span className="grid size-12 place-items-center rounded-xl bg-violet-500/10"><ShieldCheckIcon /></span><div className="flex-1"><p className="font-black">{t("publicFellowship")}</p><p className="text-sm text-muted-foreground">{t("publicDescription")}</p></div><Switch checked={isPublic} onCheckedChange={setIsPublic} /></div><LoadingButton type="submit" isPending={isPending} pendingLabel={t("creating")} className="min-h-12 w-full font-black"><SparklesIcon />{t("create")}</LoadingButton></form>{unlocks.length > 0 && <BadgeUnlockSequence badges={unlocks} index={unlockIndex} onAdvance={() => { if (unlockIndex + 1 < unlocks.length) { setUnlockIndex((value) => value + 1); return; } setUnlocks([]); if (pendingSlug) { router.push(`/fellowships/${pendingSlug}`); router.refresh(); } }} />}</>;
}
