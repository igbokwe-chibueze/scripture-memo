"use client";

import { useState, useTransition } from "react";
import { SaveIcon, ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateFellowshipAction } from "@/features/fellowships/actions/update-fellowship.action";
import { FellowshipInsigniaPicker } from "@/features/fellowships/components/fellowship-insignia-picker";
import type { FellowshipInsigniaKey } from "@/features/fellowships/constants/fellowship-insignias";
import type { FellowshipEditData } from "@/features/fellowships/types/fellowship.types";

/** Leader-only editor for durable fellowship identity and discovery status. */
export function EditFellowshipForm({ fellowship }: { fellowship: FellowshipEditData }): React.ReactNode {
  const t = useTranslations("Fellowships");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPublic, setIsPublic] = useState(fellowship.isPublic);
  const [insigniaKey, setInsigniaKey] = useState(fellowship.insigniaKey as FellowshipInsigniaKey);
  const submit = (formData: FormData): void => startTransition(async () => {
    const result = await updateFellowshipAction({ fellowshipId: fellowship.id, name: formData.get("name"), description: formData.get("description"), isPublic, insigniaKey });
    if (!result.success) { toast.error(result.message, { duration: Infinity }); return; }
    toast.success(result.message);
    router.push(`/fellowships/${fellowship.slug}`);
    router.refresh();
  });
  return <form action={submit} className="space-y-6 rounded-[2rem] border border-violet-300/25 bg-card p-5 shadow-xl sm:p-7"><label className="grid gap-2 font-bold">{t("name")}<Input name="name" required minLength={3} maxLength={50} defaultValue={fellowship.name} /></label><label className="grid gap-2 font-bold">{t("descriptionLabel")}<Textarea name="description" maxLength={280} rows={4} defaultValue={fellowship.description ?? ""} /></label><FellowshipInsigniaPicker value={insigniaKey} onChange={setInsigniaKey} /><div className="flex items-center gap-4 rounded-2xl border p-4"><span className="grid size-12 place-items-center rounded-xl bg-violet-500/10"><ShieldCheckIcon /></span><div className="flex-1"><p className="font-black">{t("publicFellowship")}</p><p className="text-sm text-muted-foreground">{t("publicDescription")}</p></div><Switch checked={isPublic} onCheckedChange={setIsPublic} /></div><LoadingButton type="submit" isPending={isPending} pendingLabel={t("saving")} className="min-h-12 w-full font-black"><SaveIcon />{t("saveChanges")}</LoadingButton></form>;
}

