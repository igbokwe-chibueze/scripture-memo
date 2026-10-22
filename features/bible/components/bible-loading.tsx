/** Route boundary preserves the standalone Bible canvas while authenticated data resolves. */
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { getTranslations } from "next-intl/server";

/** Matches the reader's comfortable width without mounting interactive controls prematurely. */
export async function BibleLoading(): Promise<React.ReactNode> {
  const t = await getTranslations("Bible");
  return (
    <main
      aria-label={t("loading")}
      className="mx-auto min-h-dvh max-w-6xl space-y-6 p-4 sm:p-6"
    >
      <h1 className="font-heading text-3xl">{t("title")}</h1>
      <LoadingSpinner label={t("loading")} />
      <div aria-hidden="true" className="space-y-4">
        {[1, 2, 3, 4].map((key) => (
          <div
            key={key}
            className="h-20 animate-pulse rounded-card bg-muted motion-reduce:animate-none"
          />
        ))}
      </div>
    </main>
  );
}
