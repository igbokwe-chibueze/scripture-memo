"use client";

import { useEffect, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";
import { registerAction } from "@/features/auth/actions/register.action";
import { PENDING_REGISTRATION_EMAIL_KEY } from "@/features/auth/constants/auth-storage";
import {
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schemas/register.schema";

const fields = [
  { name: "name", label: "Display name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
] as const;

/** Registers a player with matching client and server validation. */
export function RegisterForm(): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

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
      const result = await registerAction(input);

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

      toast.success(result.message);
      router.push(result.data?.redirectTo ?? "/select-translation");
      router.refresh();
    });
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
        <p className="text-xs text-muted-foreground">
          Use at least 8 characters with a letter and a number.
        </p>
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
