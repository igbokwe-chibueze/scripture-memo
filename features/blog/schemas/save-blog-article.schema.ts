import { z } from "@/lib/zod";

/** Restrict slugs to predictable internal URL segments, never paths or URLs. */
export const blogSlugSchema = z.string()
  .trim()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.");

/** Validate drafts and published content before authentication or persistence. */
export const saveBlogArticleSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  version: z.number().int().positive().max(2_147_483_647).optional(),
  title: z.string().trim().min(3).max(160),
  slug: blogSlugSchema,
  excerpt: z.string().trim().max(300),
  content: z.string().trim().max(60_000),
  category: z.enum(["GUIDE", "NEWS", "BEHIND_SCENES"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  byline: z.string().trim().min(2).max(80),
}).superRefine((value, context) => {
  if (Boolean(value.id) !== Boolean(value.version)) {
    context.addIssue({
      code: "custom",
      path: ["version"],
      message: "Reload this article before saving.",
    });
  }
  if (value.status === "PUBLISHED") {
    if (value.excerpt.length < 20) {
      context.addIssue({
        code: "custom",
        path: ["excerpt"],
        message: "Published articles need a summary of at least 20 characters.",
      });
    }
    if (value.content.length < 80) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: "Published articles need at least 80 characters of content.",
      });
    }
  }
});

export type SaveBlogArticleInput = z.infer<typeof saveBlogArticleSchema>;
