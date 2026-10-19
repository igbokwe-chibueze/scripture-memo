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
import {
  FELLOWSHIP_GUIDELINES_LIMIT,
  FELLOWSHIP_INTRODUCTION_LIMIT,
} from "../lib/fellowship-content";

/** Leader-only editor for durable fellowship identity and discovery status. */
export function EditFellowshipForm({
  fellowship,
}: {
  fellowship: FellowshipEditData;
}): React.ReactNode {
  const t = useTranslations("Fellowships");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPublic, setIsPublic] = useState(fellowship.isPublic);
  const [insigniaKey, setInsigniaKey] = useState(fellowship.insigniaKey as FellowshipInsigniaKey);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  /** Submit bounded overview copy through the existing leader-authorized action. */
  const submit = (formData: FormData): void => {
    setFieldErrors({});
    startTransition(async () => {
      const result = await updateFellowshipAction({
        fellowshipId: fellowship.id,
        name: formData.get("name"),
        description: formData.get("description"),
        introduction: formData.get("introduction"),
        guidelines: formData.get("guidelines"),
        isPublic,
        insigniaKey,
      });
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.message, { duration: Infinity });
        return;
      }
      toast.success(result.message);
      router.push(`/fellowships/${fellowship.slug}`);
      router.refresh();
    });
  };
  return (
    <form
      action={submit}
      className="space-y-6 rounded-[2rem] border border-selection-border/25 bg-card p-5 shadow-xl sm:p-7"
    >
      <label className="grid gap-2 font-bold">
        {t("name")}
        <Input
          name="name"
          required
          minLength={3}
          maxLength={50}
          defaultValue={fellowship.name}
        />
      </label>
      <label className="grid gap-2 font-bold">
        {t("overview.introductionLabel")}
        <Input
          name="introduction"
          className="min-h-11"
          maxLength={FELLOWSHIP_INTRODUCTION_LIMIT}
          defaultValue={fellowship.introduction ?? ""}
          placeholder={t("overview.introductionFallback")}
          disabled={isPending}
          aria-describedby="fellowship-introduction-help"
          aria-invalid={Boolean(fieldErrors.introduction)}
        />
        <span id="fellowship-introduction-help" className="text-sm font-medium text-muted-foreground">
          {fieldErrors.introduction?.join(" ") || t("overview.introductionHelp")}
        </span>
      </label>
      <label className="grid gap-2 font-bold">
        {t("descriptionLabel")}
        <Textarea
          name="description"
          maxLength={280}
          rows={4}
          defaultValue={fellowship.description ?? ""}
        />
      </label>
      <label className="grid gap-2 font-bold">
        {t("overview.guidelinesTitle")}
        <Textarea
          name="guidelines"
          maxLength={FELLOWSHIP_GUIDELINES_LIMIT}
          rows={6}
          defaultValue={fellowship.guidelines ?? t("overview.defaultGuidelines")}
          disabled={isPending}
          aria-describedby="fellowship-guidelines-help"
          aria-invalid={Boolean(fieldErrors.guidelines)}
        />
        <span id="fellowship-guidelines-help" className="text-sm font-medium text-muted-foreground">
          {fieldErrors.guidelines?.join(" ") || t("overview.guidelinesHelp")}
        </span>
      </label>
      <FellowshipInsigniaPicker
        value={insigniaKey}
        onChange={setInsigniaKey}
      />
      <div className="flex items-center gap-4 rounded-2xl border p-4">
        <span className="grid size-12 place-items-center rounded-xl bg-selection-subtle">
          <ShieldCheckIcon aria-hidden="true" />
        </span>
        <div className="flex-1">
          <label htmlFor="edit-fellowship-public" className="font-bold">
            {t("publicFellowship")}
          </label>
          <p className="text-sm text-muted-foreground">
            {t("publicDescription")}
          </p>
        </div>
        <Switch
          id="edit-fellowship-public"
          name="isPublic"
          aria-label={t("publicFellowship")}
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
      </div>
      <LoadingButton
        type="submit"
        isPending={isPending}
        pendingLabel={t("saving")}
        className="min-h-12 w-full font-bold"
      >
        <SaveIcon aria-hidden="true" />
        {t("saveChanges")}
      </LoadingButton>
    </form>
  );
}

