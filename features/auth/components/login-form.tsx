"use client";

import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";
import { loginAction } from "@/features/auth/actions/login.action";
import { PENDING_REGISTRATION_EMAIL_KEY } from "@/features/auth/constants/auth-storage";
import { PasswordInput } from "@/features/auth/components/password-input";
import {
  loginSchema,
  type LoginInput,
} from "@/features/auth/schemas/login.schema";

export type LoginFormProps = { nextPath?: string };

/** Collects credentials and surfaces validated Server Action results. */
export function LoginForm({ nextPath }: LoginFormProps): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", nextPath },
  });
  const emailField = form.register("email");

  function submit(input: LoginInput): void {
    form.clearErrors("root");
    startTransition(async () => {
      const result = await loginAction(input);

      if (!result.success) {
        Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
          if (field === "email" || field === "password") {
            form.setError(field, { message: messages[0] });
          }
        });
        form.setError("root", { message: result.message });
        toast.error(result.message, { duration: Infinity });
        return;
      }

      toast.success(result.message);
      sessionStorage.removeItem(PENDING_REGISTRATION_EMAIL_KEY);
      router.replace(result.data?.redirectTo ?? "/game");
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...emailField}
            onChange={(event) => {
              emailField.onChange(event);

              // WHY: sessionStorage is isolated to the current browser tab and
              // avoids leaking an email through query strings or server logs.
              // Only the email is retained; passwords are never persisted.
              const email = event.currentTarget.value.trim().toLowerCase();
              if (email) {
                sessionStorage.setItem(PENDING_REGISTRATION_EMAIL_KEY, email);
              } else {
                sessionStorage.removeItem(PENDING_REGISTRATION_EMAIL_KEY);
              }
            }}
          />
          <FieldError>{form.formState.errors.email?.message}</FieldError>
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
          <FieldError>{form.formState.errors.password?.message}</FieldError>
        </Field>
        <FormError message={form.formState.errors.root?.message} />
        <LoadingButton
          type="submit"
          size="lg"
          className="w-full"
          isPending={isPending}
          pendingLabel="Opening your journey"
        >
          Log in
        </LoadingButton>
      </FieldGroup>
    </form>
  );
}
