"use client";

/** Username edits validate locally and independently on the server. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";
import { showActionError } from "@/lib/errors/show-action-error";
import { updateUsernameAction } from "../actions/update-username.action";
import { usernameSchema } from "../schemas/username.schema";

/** Existing handles show the next allowed change; null handles prompt a first choice. */
export function UsernameForm({ username, nextChangeAt }: {
  username: string | null;
  nextChangeAt: string | null;
}): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(username ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // The server supplies a future date only while the cooldown is active.
  // No browser clock or polling decides whether a write is authorized.
  const coolingDown = nextChangeAt !== null;

  return (
    <section className="space-y-3 rounded-card border border-border bg-card p-4 sm:p-5">
      <h2 className="font-heading text-xl">{t("usernameTitle")}</h2>
      <p
        id="username-help"
        className="text-sm text-muted-foreground"
      >{t("usernameHelp")}</p>
      {coolingDown && nextChangeAt && (
        <p className="text-sm text-muted-foreground">
          {t("usernameNextChange", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(nextChangeAt)) })}
        </p>
      )}
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = usernameSchema.safeParse(value);
          if (!parsed.success) {
            setError(t("usernameInvalid"));
            return;
          }
          setError("");
          startTransition(async () => {
            try {
              const result = await updateUsernameAction({ username: parsed.data });
              if (!result.success) return showActionError(result);
              setValue(parsed.data);
              toast.success(result.message);
              router.refresh();
            } catch {
              toast.error(t("errors.failed"), { duration: Infinity });
            }
          });
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("usernameTitle")}</span>
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="@amara_grace"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={25}
            disabled={pending || coolingDown}
            aria-describedby="username-help username-error"
            aria-invalid={Boolean(error)}
            className="min-h-12"
          />
        </label>
        <LoadingButton
          type="submit"
          isPending={pending}
          pendingLabel={t("saving")}
          disabled={coolingDown}
        >
          {t("saveUsername")}
        </LoadingButton>
      </form>
      <p
        id="username-error"
        role="status"
        className="text-sm text-destructive"
      >{error}</p>
    </section>
  );
}
