"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { saveBlogArticleSchema } from "../schemas/save-blog-article.schema";
import { blogRepository, BlogSaveConflict } from "../repositories/blog.repository";

/** Validate, authorize, persist with audit, and invalidate public/editor views. */
export async function saveBlogArticleAction(input: unknown): Promise<ActionResult<{
  id: string;
  version: number;
  publishedAt: string | null;
}>> {
  const parsed = saveBlogArticleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted article fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }
  try {
    const article = await blogRepository.save(parsed.data, session.user.id);
    revalidatePath("/blog");
    revalidatePath("/blog/[slug]", "page");
    revalidatePath("/admin/blog");
    revalidatePath("/admin/blog/[articleId]", "page");
    return {
      success: true,
      message: article.status === "PUBLISHED"
        ? "Article saved and published."
        : "Draft saved. This article is not publicly visible.",
      data: {
        id: article.id,
        version: article.version,
        publishedAt: article.publishedAt?.toISOString() ?? null,
      },
    };
  } catch (error) {
    if (error instanceof BlogSaveConflict) {
      if (error.reason === "SLUG") {
        return {
          success: false,
          message: "A previously published article must keep its original URL.",
          fieldErrors: { slug: ["Keep the original slug."] },
        };
      }
      return {
        success: false,
        message: "This article changed in another session. Reload before saving.",
        errorCode: "BLG-001",
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message: "That article URL is already in use.",
        errorCode: "BLG-002",
        fieldErrors: { slug: ["Choose a different slug."] },
      };
    }
    logger.error("Unable to save blog article.", { actorId: session.user.id });
    return {
      success: false,
      message: "The article could not be saved. Please try again.",
      errorCode: "BLG-003",
    };
  }
}
