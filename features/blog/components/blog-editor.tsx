"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/shared/loading-button";
import { NavigationButton } from "@/components/shared/navigation-button";
import { showActionError } from "@/lib/errors/show-action-error";
import { saveBlogArticleAction } from "../actions/save-blog-article.action";
import { saveBlogArticleSchema, type SaveBlogArticleInput } from "../schemas/save-blog-article.schema";
import { BLOG_CATEGORIES } from "../constants/blog-categories";
import { ArticleBody } from "./article-body";
import styles from "./blog.module.css";

/**
 * Administrator editor with safe live Markdown preview and explicit publication.
 * Local dirty state survives rejected saves; the server repeats validation/roles.
 * A browser unload warning protects unsaved text without any autosave polling.
 */
export function BlogEditor({
  initialValues,
  previouslyPublished,
}: {
  initialValues: SaveBlogArticleInput;
  previouslyPublished: boolean;
}): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);
  const [slugLocked, setSlugLocked] = useState(previouslyPublished);
  const form = useForm<SaveBlogArticleInput>({
    resolver: zodResolver(saveBlogArticleSchema),
    defaultValues: initialValues,
  });
  const values = useWatch({ control: form.control });
  const { isDirty, errors } = form.formState;

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  /** Only server-confirmed IDs/versions replace local optimistic-save state. */
  function save(valuesToSave: SaveBlogArticleInput): void {
    startTransition(async () => {
      try {
        const result = await saveBlogArticleAction(valuesToSave);
        if (!result.success) {
          for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
            if (name in valuesToSave) {
              form.setError(name as keyof SaveBlogArticleInput, { message: messages[0] });
            }
          }
          showActionError(result);
          return;
        }
        if (!result.data) return;
        form.reset({ ...valuesToSave, id: result.data.id, version: result.data.version });
        setSlugLocked(Boolean(result.data.publishedAt));
        toast.success(result.message, { duration: 4_000 });
        if (!initialValues.id) router.replace(`/admin/blog/${result.data.id}`);
        router.refresh();
      } catch {
        toast.error("The save could not be confirmed. Keep your text and retry.", { duration: Infinity });
      }
    });
  }

  /** Consistent field errors are both visible and programmatically associated. */
  function fieldError(name: keyof SaveBlogArticleInput): React.ReactNode {
    const error = errors[name];
    return error?.message ? (
      <p id={`${name}-error`} className="text-sm text-error-text" role="alert">
        {error.message}
      </p>
    ) : null;
  }

  return (
    <form
      onSubmit={form.handleSubmit(save, () => {
        toast.error("Check the highlighted article fields.", { duration: Infinity });
      })}
      className="space-y-6"
    >
      <fieldset disabled={isPending} className="space-y-5 disabled:opacity-60">
        <legend className="sr-only">Article details</legend>
        <div className={styles.editorFields}>
          <div className={styles.field}>
            <label htmlFor="title">Title</label>
            <Input
              id="title"
              maxLength={160}
              aria-invalid={Boolean(errors.title)}
              aria-describedby="title-error"
              {...form.register("title")}
            />
            {fieldError("title")}
          </div>
          <div className={styles.field}>
            <label htmlFor="slug">Article URL</label>
            <Input
              id="slug"
              readOnly={slugLocked}
              maxLength={120}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby="slug-help slug-error"
              {...form.register("slug")}
            />
            <p id="slug-help" className="text-xs text-muted-foreground">
              /blog/{values.slug || "your-article-title"}. The URL stays fixed after first publication.
            </p>
            {fieldError("slug")}
          </div>
          <div className={styles.field}>
            <label htmlFor="category">Category</label>
            <select id="category" className={styles.select} {...form.register("category")}>
              {Object.entries(BLOG_CATEGORIES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="byline">Public author name</label>
            <Input
              id="byline"
              maxLength={80}
              aria-invalid={Boolean(errors.byline)}
              aria-describedby="byline-error"
              {...form.register("byline")}
            />
            {fieldError("byline")}
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="excerpt">Summary</label>
          <Textarea
            id="excerpt"
            rows={3}
            maxLength={300}
            aria-invalid={Boolean(errors.excerpt)}
            aria-describedby="excerpt-error"
            {...form.register("excerpt")}
          />
          {fieldError("excerpt")}
        </div>
        <div className={styles.field}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="content">Article content</label>
            <Button
              type="button"
              variant="outline"
              aria-pressed={preview}
              onClick={() => setPreview(!preview)}
              className="min-h-11"
            >
              {preview ? "Return to writing" : "Preview article"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Use ## headings, **bold**, numbered or bulleted lists, and [links](/blog).
          </p>
          {preview ? (
            <section aria-label="Unpublished article preview" className={styles.preview}>
              <p className="mb-4 text-sm font-bold text-muted-foreground">Preview · unsaved changes are included</p>
              <h2 className="mb-5 font-heading text-3xl font-bold">{values.title || "Untitled article"}</h2>
              <ArticleBody content={values.content || "Your article will appear here."} />
            </section>
          ) : (
            <Textarea
              id="content"
              rows={20}
              maxLength={60_000}
              aria-invalid={Boolean(errors.content)}
              aria-describedby="content-error"
              {...form.register("content")}
            />
          )}
          {fieldError("content")}
        </div>
        <div className={styles.field}>
          <label htmlFor="status">Visibility after saving</label>
          <select id="status" className={styles.select} {...form.register("status")}>
            <option value="DRAFT">Draft · only administrators can read it</option>
            <option value="PUBLISHED">Published · visible to everyone</option>
          </select>
          <p className="text-sm text-muted-foreground">
            {values.status === "PUBLISHED"
              ? "Saving publishes these changes immediately to the public blog."
              : "Saving as a draft removes an already published article from public view."}
          </p>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4 pb-3">
        <LoadingButton type="submit" isPending={isPending} pendingLabel="Saving article" className="min-h-12 px-6">
          {values.status === "PUBLISHED" ? "Save and publish" : "Save draft"}
        </LoadingButton>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {isDirty ? "Unsaved changes" : "No unsaved changes"}
        </p>
        <NavigationButton href="/admin/blog" pendingLabel="Opening articles" variant="outline" className="min-h-11">
          All articles
        </NavigationButton>
      </div>
    </form>
  );
}
