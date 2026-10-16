"use client";

import { useEffect, useState } from "react";
import { Controller, useWatch, type Control } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { playAudioFeedback } from "@/hooks/use-audio-feedback";
import { useFlameAmbience } from "@/hooks/use-flame-ambience";
import type { UpdateUserSettingsInput } from "../schemas/update-user-settings.schema";

/**
 * Draft-only previews never save preferences or consume gameplay resources.
 * Ambience stops after four seconds, on tab unmount, or when audio is disabled.
 * Native ranges support touch/keyboard and retain an explicit 44px hit target.
 */
export function GameVolumeControls({ control, disabled }: {
  control: Control<UpdateUserSettingsInput>;
  disabled: boolean;
}): React.ReactNode {
  const t = useTranslations("Settings");
  const enabled = useWatch({ control, name: "audioEnabled" });
  const effects = useWatch({ control, name: "soundEffectsVolume" });
  const ambience = useWatch({ control, name: "ambienceVolume" });
  const [previewing, setPreviewing] = useState(false);
  useFlameAmbience(previewing && !disabled, ambience, enabled);

  useEffect(() => {
    if (!previewing) return;
    const timeout = window.setTimeout(() => setPreviewing(false), 4_000);
    return () => window.clearTimeout(timeout);
  }, [previewing]);

  return (
    <div className="space-y-5">
      {(["soundEffectsVolume", "ambienceVolume"] as const).map((name) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor={name}>
                  {t(name)}
                </FieldLabel>
                <output
                  htmlFor={name}
                  className="font-bold text-primary"
                >{field.value}%</output>
              </div>
              <Input
                ref={field.ref}
                id={name}
                name={field.name}
                type="range"
                min={0}
                max={100}
                step={1}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.currentTarget.valueAsNumber)}
                disabled={disabled}
                aria-valuetext={`${field.value}%`}
                aria-invalid={fieldState.invalid}
                className="min-h-11 w-full accent-primary bg-transparent px-0 shadow-none"
              />
              <FieldDescription>
                {t(name === "soundEffectsVolume" ? "effectsDescription" : "ambienceDescription")}
              </FieldDescription>
              <FieldError>
                {fieldState.error?.message}
              </FieldError>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 self-start"
                disabled={disabled || !enabled || field.value === 0}
                onClick={() => {
                  if (name === "soundEffectsVolume") {
                    playAudioFeedback("correct", { volume: effects, enabled });
                  } else {
                    setPreviewing((current) => !current);
                  }
                }}
              >
                {name === "ambienceVolume" && previewing ? t("stopPreview") : t("previewSound")}
              </Button>
            </Field>
          )}
        />
      ))}
    </div>
  );
}
