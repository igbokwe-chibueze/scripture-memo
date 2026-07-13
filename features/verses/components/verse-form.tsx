"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpenText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { createVerseAction } from "@/features/verses/actions/create-verse.action";
import { updateVerseAction } from "@/features/verses/actions/update-verse.action";
import { MarkdownEditor } from "@/features/verses/components/markdown-editor";
import { BIBLE_BOOK_NAMES } from "@/features/verses/data/bible-structure";
import {
  formatBibleReference,
  getBibleChapterCount,
  getBibleVerseCount,
  isBibleBookName,
} from "@/features/verses/lib/bible-reference";
import {
  verseFormSchema,
  type VerseFormInput,
  type VerseFormValues,
} from "@/features/verses/schemas/verse.schema";

export type VerseFormProps = {
  mode: "create" | "edit";
  initialValues: VerseFormInput;
};

const translations = ["NIV", "ESV", "KJV"] as const;
const bookOptions = BIBLE_BOOK_NAMES.map((book) => ({ value: book, label: book }));

/** Complete verse editor shared by create and edit admin views. */
export function VerseForm({ mode, initialValues }: VerseFormProps): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<VerseFormInput, unknown, VerseFormValues>({
    resolver: zodResolver(verseFormSchema),
    defaultValues: initialValues,
  });
  const selectedBook = useWatch({ control: form.control, name: "book" });
  const selectedChapter = useWatch({ control: form.control, name: "chapter" });
  const selectedVerseStart = useWatch({ control: form.control, name: "verseStart" });
  const selectedVerseEnd = useWatch({ control: form.control, name: "verseEnd" });
  const chapterCount = getBibleChapterCount(selectedBook);
  const verseCount = getBibleVerseCount(selectedBook, Number(selectedChapter));
  const referencePreview =
    isBibleBookName(selectedBook) &&
    Number.isInteger(Number(selectedChapter)) &&
    Number.isInteger(Number(selectedVerseStart))
      ? formatBibleReference(
          selectedBook,
          Number(selectedChapter),
          Number(selectedVerseStart),
          selectedVerseEnd === "" ? "" : Number(selectedVerseEnd),
        )
      : "Select a valid book, chapter, and verse.";

  const chapterRegistration = form.register("chapter", { valueAsNumber: true });

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
        <CardHeader className="border-b">
          <CardTitle>Scripture reference</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a canonical Bible location. Chapter and verse limits adjust automatically.
          </p>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-6">
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <BookOpenText className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wider text-primary uppercase">Generated reference</p>
                <output className="mt-1 block wrap-break-word text-lg font-semibold tracking-tight sm:text-xl" aria-live="polite">
                  {referencePreview}
                </output>
              </div>
            </div>

            <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Controller
                control={form.control}
                name="book"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="sm:col-span-2 lg:col-span-2">
                    <FieldLabel>Book</FieldLabel>
                    <SearchableSelect
                      value={field.value}
                      options={bookOptions}
                      label="Bible book"
                      placeholder="Select a book"
                      searchPlaceholder="Search 66 books…"
                      emptyMessage="No Bible book matches your search."
                      disabled={isPending}
                      invalid={fieldState.invalid}
                      onValueChange={(book) => {
                        field.onChange(book);
                        // WHY: A new book changes every downstream bound. Resetting
                        // the location prevents stale values from describing an
                        // impossible reference during the next render.
                        form.setValue("chapter", 1, { shouldValidate: true });
                        form.setValue("verseStart", 1, { shouldValidate: true });
                        form.setValue("verseEnd", "", { shouldValidate: true });
                      }}
                    />
                    <FieldDescription>Search or browse the canonical 66 books.</FieldDescription>
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />
              <Field>
                <FieldLabel htmlFor="chapter">Chapter</FieldLabel>
                <Input
                  id="chapter"
                  type="number"
                  min={1}
                  max={chapterCount}
                  disabled={isPending || !selectedBook}
                  {...chapterRegistration}
                  onChange={(event) => {
                    void chapterRegistration.onChange(event);
                    form.setValue("verseStart", 1, { shouldValidate: true });
                    form.setValue("verseEnd", "", { shouldValidate: true });
                  }}
                />
                <FieldDescription>{chapterCount ? `1–${chapterCount}` : "Select a book first."}</FieldDescription>
                <FieldError>{form.formState.errors.chapter?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="verse-start">Start</FieldLabel>
                <Input id="verse-start" type="number" min={1} max={verseCount} disabled={isPending || !verseCount} {...form.register("verseStart", { valueAsNumber: true })} />
                <FieldDescription>{verseCount ? `1–${verseCount}` : "Choose a chapter."}</FieldDescription>
                <FieldError>{form.formState.errors.verseStart?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="verse-end">End</FieldLabel>
                <Input id="verse-end" type="number" min={1} max={verseCount} disabled={isPending || !verseCount} {...form.register("verseEnd")} />
                <FieldDescription>{verseCount ? `Optional · max ${verseCount}` : "Optional range."}</FieldDescription>
                <FieldError>{form.formState.errors.verseEnd?.message}</FieldError>
              </Field>
            </div>

            <Field className="border-t pt-5">
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
