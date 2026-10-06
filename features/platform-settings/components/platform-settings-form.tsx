"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { showActionError } from "@/lib/errors/show-action-error";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types/api";
import { updatePlatformSettingsAction } from "@/features/platform-settings/actions/update-platform-settings.action";
import {
  updatePlatformSettingsSchema,
  type UpdatePlatformSettingsInput,
} from "@/features/platform-settings/schemas/update-platform-settings.schema";

/** Edits platform-wide defaults with client feedback and server revalidation. */
export function PlatformSettingsForm({
  initialValues,
}: {
  initialValues: UpdatePlatformSettingsInput;
}): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<UpdatePlatformSettingsInput>({
    resolver: zodResolver(updatePlatformSettingsSchema),
    defaultValues: initialValues,
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const result: ActionResult = await updatePlatformSettingsAction(
        values,
      ).catch((): ActionResult => ({
        success: false,
        message: "Platform settings could not be saved. Please try again.",
      }));
      if (!result.success) {
        setSubmitError(result.message);
        Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
          if (field in getValues()) {
            setError(field as keyof UpdatePlatformSettingsInput, {
              message: messages[0],
            });
          }
        });
        showActionError(result);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-6 rounded-3xl border bg-card p-4 sm:p-6"
    >
      <div className="space-y-2">
        <label htmlFor="defaultTranslation" className="font-bold">
          Default Bible translation
        </label>
        <select
          id="defaultTranslation"
          {...register("defaultTranslation")}
          aria-invalid={Boolean(errors.defaultTranslation)}
          className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-base"
        >
          <option value="KJV">KJV — King James Version</option>
          <option value="WEB">WEB — World English Bible</option>
          <option value="BSB">BSB — Berean Standard Bible</option>
        </select>
        {errors.defaultTranslation && (
          <p className="text-sm text-destructive" role="alert">
            {errors.defaultTranslation.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          KJV is the current default. This setting is used for new accounts and
          as the fallback when a verse lacks a learner’s selection.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="baseGlowPoints" className="font-bold">
          Base Glow reward
        </label>
        <Input
          id="baseGlowPoints"
          type="number"
          min={1}
          max={10_000}
          inputMode="numeric"
          aria-invalid={Boolean(errors.baseGlowPoints)}
          {...register("baseGlowPoints", { valueAsNumber: true })}
        />
        {errors.baseGlowPoints && (
          <p className="text-sm text-destructive" role="alert">
            {errors.baseGlowPoints.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Glimmer pays the base amount; Glow pays 1.5× and Radiance 2×. New
          values apply to future day completions; recorded rewards and balances
          stay unchanged.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="defaultHintAllowance" className="font-bold">
          Starting hints for new accounts
        </label>
        <Input
          id="defaultHintAllowance"
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          aria-invalid={Boolean(errors.defaultHintAllowance)}
          {...register("defaultHintAllowance", { valueAsNumber: true })}
        />
        {errors.defaultHintAllowance && (
          <p className="text-sm text-destructive" role="alert">
            {errors.defaultHintAllowance.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          The current default is 5. Existing accounts keep their saved allowance when this value changes.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border p-4">
        <label
          htmlFor="adminCooldownTestingEnabled"
          className="flex min-h-11 cursor-pointer items-center gap-3 font-bold"
        >
          <input
            id="adminCooldownTestingEnabled"
            type="checkbox"
            className="size-5 accent-primary"
            {...register("adminCooldownTestingEnabled")}
          />
          Allow administrators to bypass their own cooldowns for testing
        </label>
        <p className="text-sm text-muted-foreground">
          Enabled by default to preserve current admin testing. This does not
          change player cooldown rules.
        </p>
      </div>

      {submitError && (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      )}

      <LoadingButton
        type="submit"
        isPending={isPending}
        pendingLabel="Saving platform settings"
      >
        Save platform settings
      </LoadingButton>
    </form>
  );
}
