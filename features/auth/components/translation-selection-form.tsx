"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";
import { LoadingButton } from "@/components/shared/loading-button";
import { cn } from "@/lib/utils";
import { selectTranslationAction } from "@/features/auth/actions/select-translation.action";
import {
  AVAILABLE_TRANSLATION_CODES,
  TRANSLATION_NAMES,
} from "@/features/verses/constants/translations";
import type { SelectTranslationInput } from "@/features/auth/schemas/select-translation.schema";

const translationDescriptions = {
  KJV: "Classic traditional language.",
  WEB: "Clear public-domain modern English.",
  BSB: "Readable and closely grounded in the source text.",
} as const;

const translations: Array<{
  code: SelectTranslationInput["translation"];
  name: string;
  description: string;
}> = AVAILABLE_TRANSLATION_CODES.map((code) => ({
  code,
  name: TRANSLATION_NAMES[code],
  description: translationDescriptions[code],
}));

/** Saves the player's required first-login translation preference. */
export function TranslationSelectionForm({ nextPath }: { nextPath: string }): React.ReactNode {
  const router = useRouter();
  const [selection, setSelection] = useState<SelectTranslationInput["translation"]>("KJV");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await selectTranslationAction({ translation: selection });
          if (!result.success) {
            toast.error(result.message, { duration: Infinity });
            return;
          }
          toast.success(result.message);
          // WHY: A single replace avoids overlapping a route navigation with an
          // immediate refresh. The previous push-plus-refresh pair could leave
          // React's transition pending even after the database save completed.
          router.replace(nextPath || result.data?.redirectTo || "/game");
        });
      }}
      className="space-y-6"
    >
      <fieldset className="space-y-3">
        <legend className="sr-only">Bible translation</legend>
        {translations.map((translation) => {
          const selected = selection === translation.code;
          return (
            <label
              key={translation.code}
              className={cn(
                "flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition",
                selected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <input
                type="radio"
                name="translation"
                value={translation.code}
                checked={selected}
                onChange={() => setSelection(translation.code)}
                className="sr-only"
              />
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                {translation.code}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{translation.name}</span>
                <span className="block text-sm text-muted-foreground">{translation.description}</span>
              </span>
              {selected && <CheckIcon className="size-5 text-primary" aria-hidden="true" />}
            </label>
          );
        })}
      </fieldset>
      <LoadingButton
        type="submit"
        size="lg"
        className="w-full"
        isPending={isPending}
        pendingLabel="Saving your translation"
      >
        Begin my journey
      </LoadingButton>
    </form>
  );
}
