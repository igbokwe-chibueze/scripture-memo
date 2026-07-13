"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";
import { createPackAction } from "@/features/packs/actions/create-pack.action";
import { updatePackAction } from "@/features/packs/actions/update-pack.action";
import {
  packFormSchema,
  type PackFormInput,
  type PackFormValues,
} from "@/features/packs/schemas/pack.schema";

export type PackFormProps = {
  mode: "create" | "edit";
  initialValues: PackFormInput;
};

/** Metadata editor shared by pack creation and editing views. */
export function PackForm({ mode, initialValues }: PackFormProps): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<PackFormInput, unknown, PackFormValues>({
    resolver: zodResolver(packFormSchema),
    defaultValues: initialValues,
  });

  function submit(values: PackFormValues): void {
    form.clearErrors("root");
    startTransition(async () => {
      const result = mode === "create"
        ? await createPackAction(values)
        : await updatePackAction(values);
      if (!result.success) {
        Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
          if (field in form.getValues()) {
            form.setError(field as keyof PackFormInput, { message: messages[0] });
          }
        });
        form.setError("root", { message: result.message });
        toast.error(result.message, { duration: Infinity });
        return;
      }

      toast.success(result.message);
      if (mode === "create" && result.data?.id) {
        router.replace(`/admin/packs/${result.data.id}/edit`);
      } else {
        form.reset(values);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-5">
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.name)}>
          <FieldLabel htmlFor="pack-name">Pack name</FieldLabel>
          <Input id="pack-name" placeholder="Promises for anxious hearts" disabled={isPending} {...form.register("name")} />
          <FieldDescription>A URL-safe slug is generated automatically from this name.</FieldDescription>
          <FieldError>{form.formState.errors.name?.message}</FieldError>
        </Field>
        <Field data-invalid={Boolean(form.formState.errors.description)}>
          <FieldLabel htmlFor="pack-description">Description</FieldLabel>
          <Textarea id="pack-description" rows={4} placeholder="Explain the theme and learning purpose of this pack." disabled={isPending} {...form.register("description")} />
          <FieldError>{form.formState.errors.description?.message}</FieldError>
        </Field>
      </FieldGroup>

      <FormError message={form.formState.errors.root?.message} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <LoadingButton type="button" variant="outline" onClick={() => router.push("/admin/packs")}>Cancel</LoadingButton>
        <LoadingButton type="submit" isPending={isPending} pendingLabel="Saving pack" disabled={mode === "edit" && !form.formState.isDirty}>
          {mode === "create" ? "Create hidden pack" : "Save details"}
        </LoadingButton>
      </div>
    </form>
  );
}
