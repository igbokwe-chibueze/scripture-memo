import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleForEditor } from "../lib/get-blog-data";
import { BlogEditor } from "../components/blog-editor";
import styles from "../components/blog.module.css";

export const metadata: Metadata = {
  title: "Edit article | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Authenticated editor for a saved article or a new unsaved draft. */
export async function BlogEditorView({ params }: {
  params: Promise<{ articleId: string }>;
}): Promise<React.ReactNode> {
  const { articleId } = await params;
  const article = await getArticleForEditor(articleId === "new" ? undefined : articleId);
  if (articleId !== "new" && !article) notFound();
  return (
    <main className={styles.container}>
      <header className="space-y-2 py-6">
        <p className={styles.eyebrow}>Administration · editorial</p>
        <h1 className="font-heading text-3xl font-bold">{article ? "Edit article" : "Write a new article"}</h1>
        <p className="text-muted-foreground">Drafts are private. Choose Published and save when you are ready to share.</p>
      </header>
      <BlogEditor
        key={article?.id ?? "new"}
        previouslyPublished={Boolean(article?.publishedAt)}
        initialValues={{
          id: article?.id,
          version: article?.version,
          title: article?.title ?? "",
          slug: article?.slug ?? "",
          excerpt: article?.excerpt ?? "",
          content: article?.content ?? "",
          category: article?.category ?? "GUIDE",
          status: article?.status ?? "DRAFT",
          byline: article?.byline ?? "Scripture Memo",
        }}
      />
    </main>
  );
}
