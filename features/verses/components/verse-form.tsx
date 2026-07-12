"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";
import { createVerseAction } from "@/features/verses/actions/create-verse.action";
import { updateVerseAction } from "@/features/verses/actions/update-verse.action";
import { MarkdownEditor } from "@/features/verses/components/markdown-editor";
import {
  verseFormSchema,
  type VerseFormInput,
  type VerseFormValues,
} from "@/features/verses/schemas/verse.schema";

export type VerseFormProps = {
  mode: "create" | "edit";
  initialValues: VerseFormValues;
};

const translations = ["NIV", "ESV", "KJV"] as const;

/** Complete verse editor shared by create and edit admin views. */
export function VerseForm({ mode, initialValues }: VerseFormProps): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<VerseFormInput, unknown, VerseFormValues>({
    resolver: zodResolver(verseFormSchema),
    defaultValues: initialValues,
  });

  function submit(values: VerseFormValues): void {
    form.clearErrors("root");
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createVerseAction(values)
          : await updateVerseAction(values);

      if (!result.success) {
        form.setError("root", { message: result.message });
        toast.error(result.message, { duration: Infinity });
        return;
      }

      toast.success(result.message);
      router.replace("/admin/verses");
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Scripture reference</CardTitle></CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="reference">Reference</FieldLabel>
                <Input id="reference" placeholder="John 3:16" {...form.register("reference")} />
                <FieldError>{form.formState.errors.reference?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="book">Book</FieldLabel>
                <Input id="book" placeholder="John" {...form.register("book")} />
                <FieldError>{form.formState.errors.book?.message}</FieldError>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel htmlFor="chapter">Chapter</FieldLabel>
                <Input id="chapter" type="number" min={1} {...form.register("chapter", { valueAsNumber: true })} />
                <FieldError>{form.formState.errors.chapter?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="verse-start">Start</FieldLabel>
                <Input id="verse-start" type="number" min={1} {...form.register("verseStart", { valueAsNumber: true })} />
                <FieldError>{form.formState.errors.verseStart?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="verse-end">End</FieldLabel>
                <Input id="verse-end" type="number" min={1} {...form.register("verseEnd")} />
                <FieldError>{form.formState.errors.verseEnd?.message}</FieldError>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="tags">Tags</FieldLabel>
              <Input id="tags" placeholder="love, salvation" {...form.register("tags")} />
              <FieldDescription>Separate tags with commas.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Translations</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {translations.map((translation) => (
            <Field key={translation}>
              <FieldLabel htmlFor={`translation-${translation}`}>{translation}</FieldLabel>
              <Textarea
                id={`translation-${translation}`}
                rows={4}
                {...form.register(`translations.${translation}`)}
              />
              <FieldError>{form.formState.errors.translations?.[translation]?.message}</FieldError>
            </Field>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Study content</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <Field>
            <FieldLabel htmlFor="reflection">Reflection</FieldLabel>
            <Textarea id="reflection" rows={4} {...form.register("reflection")} />
          </Field>
          <Controller
            control={form.control}
            name="studyNote"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="study-note">Study note</FieldLabel>
                <MarkdownEditor
                  id="study-note"
                  value={field.value ?? ""}
                  maxLength={5000}
                  invalid={fieldState.invalid}
                  disabled={isPending}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
                <FieldDescription>
                  Format deeper teaching notes with Markdown and review the safe preview before saving.
                </FieldDescription>
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Field orientation="horizontal" className="min-h-16 items-center rounded-xl border p-4">
                <div className="flex-1">
                  <FieldLabel htmlFor="is-active">Published</FieldLabel>
                  <FieldDescription>Make this verse available for curriculum assignment.</FieldDescription>
                </div>
                <Switch id="is-active" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
        </CardContent>
      </Card>

      <FormError message={form.formState.errors.root?.message} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <LoadingButton type="button" variant="outline" onClick={() => router.push("/admin/verses")}>
          Cancel
        </LoadingButton>
        <LoadingButton type="submit" isPending={isPending} pendingLabel="Saving verse">
          {mode === "create" ? "Create verse" : "Save changes"}
        </LoadingButton>
      </div>
    </form>
  );
}
