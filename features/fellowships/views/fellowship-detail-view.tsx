import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { FellowshipDetail } from "@/features/fellowships/components/fellowship-detail";
import { fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { getServerSession } from "@/lib/auth/session";
import styles from "../components/fellowship-detail.module.css";
export const metadata: Metadata = {
  title: "Fellowship | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Authenticates the route before loading member-safe overview and governance data. */
export async function FellowshipDetailView({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactNode> {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const [data, t] = await Promise.all([
    fellowshipRepository.getDetail(session.user.id, slug),
    getTranslations("Fellowships"),
  ]);
  if (!data) notFound();

  return (
    <main className={styles.page}>
      <NavigationButton
        href="/fellowships"
        pendingLabel={t("opening")}
        variant="secondary"
        className="mb-6 min-h-11"
      >
        <ArrowLeftIcon aria-hidden="true" />
        {t("back")}
      </NavigationButton>
      <FellowshipDetail fellowship={data} />
    </main>
  );
}
