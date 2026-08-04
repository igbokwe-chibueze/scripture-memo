"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRoundIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { resetPasswordAction } from "@/features/auth/actions/reset-password.action";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/features/auth/schemas/reset-password.schema";

export type ResetPasswordFormProps = { token: string };

/** Replaces a credential through Better Auth using the URL token. */
export function ResetPasswordForm({ token }: ResetPasswordFormProps): React.ReactNode {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });

  function submit(input: ResetPasswordInput): void {
    form.clearErrors("root");
    startTransition(async () => {
      const result = await resetPasswordAction(input);
      if (!result.success) {
        Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
          if (field === "password" || field === "confirmPassword" || field === "token") {
            form.setError(field, { message: messages[0] });
          }
        });
        form.setError("root", { message: result.message });
        toast.error(result.message, { duration: Infinity });
        return;
      }

      toast.success(result.message);
      router.replace(result.data?.redirectTo ?? "/login");
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <input type="hidden" {...form.register("token")} />
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <FieldLabel htmlFor="new-password">{t("newPassword")}</FieldLabel>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            showStrength
            value={password}
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
          <FieldError>{form.formState.errors.password?.message}</FieldError>
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
          <FieldLabel htmlFor="confirm-new-password">{t("confirmPassword")}</FieldLabel>
          <PasswordInput
            id="confirm-new-password"
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
          pendingLabel={t("resettingPassword")}
        >
          <KeyRoundIcon aria-hidden="true" />
          {t("resetPassword")}
        </LoadingButton>
      </FieldGroup>
    </form>
  );
}
