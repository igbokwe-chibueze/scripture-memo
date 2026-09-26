"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { DownloadIcon, MailCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NavigationButton } from "@/components/shared/navigation-button";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";
import { registerAction } from "@/features/auth/actions/register.action";
import { PENDING_REGISTRATION_EMAIL_KEY } from "@/features/auth/constants/auth-storage";
import { PasswordInput } from "@/features/auth/components/password-input";
import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schemas/register.schema";

const fields = [
  { name: "name", label: "Display name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
] as const;

type VerificationDownload = { fileName: string; content: string };

/** Registers a player with matching client and server validation. */
export function RegisterForm({ nextPath }: { nextPath: string }): React.ReactNode {
  const t = useTranslations("Auth");
  const [isPending, startTransition] = useTransition();
  const [verificationDownload, setVerificationDownload] =
    useState<VerificationDownload>();
  const [verificationPending, setVerificationPending] = useState(false);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });

  function downloadVerificationFile(file: VerificationDownload): void {
    // WHY: This local-only bearer link is downloaded for manual testing and is
    // never stored in browser storage, a URL parameter, or application data.
    const blobUrl = URL.createObjectURL(
      new Blob([file.content], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = file.fileName;
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  }

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem(PENDING_REGISTRATION_EMAIL_KEY);
    if (!pendingEmail) return;

    // WHY: The value is consumed once so stale addresses do not unexpectedly
    // appear in later registration attempts within the same browser tab. The
    // server still validates and normalizes the untrusted value independently.
    form.setValue("email", pendingEmail, {
      shouldDirty: true,
      shouldValidate: true,
    });
    sessionStorage.removeItem(PENDING_REGISTRATION_EMAIL_KEY);
  }, [form]);

  function submit(input: RegisterInput): void {
    form.clearErrors("root");
    startTransition(async () => {
      const result = await registerAction({ ...input, nextPath });

      if (!result.success) {
        Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
          if (field in form.getValues()) {
            form.setError(field as keyof RegisterInput, { message: messages[0] });
          }
        });
        form.setError("root", { message: result.message });
        toast.error(result.message, { duration: Infinity });
        return;
      }

      const localDownload = result.data?.lightDevDownload;
      setVerificationPending(true);
      setVerificationDownload(localDownload);
      if (localDownload) downloadVerificationFile(localDownload);
      toast.info(result.message);
    });
  }

  if (verificationPending) {
    return (
      <section className="space-y-4" aria-live="polite">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
          <MailCheckIcon className="mx-auto mb-3 size-10 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-bold">{t("checkEmailTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("checkEmailBody")}
          </p>
        </div>
        {verificationDownload && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => downloadVerificationFile(verificationDownload)}
          >
            <DownloadIcon aria-hidden="true" />
            {t("downloadVerification")}
          </Button>
        )}
        <NavigationButton
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          size="lg"
          className="w-full"
          pendingLabel={t("returnToLogin")}
        >
          {t("returnToLogin")}
        </NavigationButton>
      </section>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        {fields.map((field) => {
          const error = form.formState.errors[field.name];
          return (
            <Field key={field.name} data-invalid={Boolean(error)}>
              <FieldLabel htmlFor={`register-${field.name}`}>{field.label}</FieldLabel>
              <Input
                id={`register-${field.name}`}
                type={field.type}
                autoComplete={field.autoComplete}
                aria-invalid={Boolean(error)}
                {...form.register(field.name)}
              />
              <FieldError>{error?.message}</FieldError>
            </Field>
          );
        })}
        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <FieldLabel htmlFor="register-password">Password</FieldLabel>
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            value={password}
            showStrength
            {...form.register("password")}
          />
          <FieldError>{form.formState.errors.password?.message}</FieldError>
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
          <FieldLabel htmlFor="register-confirmPassword">Confirm password</FieldLabel>
          <PasswordInput
            id="register-confirmPassword"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.confirmPassword)}
            {...form.register("confirmPassword")}
          />
          <FieldError>{form.formState.errors.confirmPassword?.message}</FieldError>
        </Field>
        <FormError message={form.formState.errors.root?.message} />
        <LoadingButton
          type="submit"
          size="lg"
          className="w-full"
          isPending={isPending}
          pendingLabel="Creating your journey"
        >
          Create account
        </LoadingButton>
      </FieldGroup>
    </form>
  );
}
