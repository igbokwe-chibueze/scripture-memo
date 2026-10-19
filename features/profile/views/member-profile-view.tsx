/** Authenticated placeholder only; full public profile content is intentionally not implemented. */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeftIcon, UserRoundIcon } from "lucide-react";
import { getServerSession } from "@/lib/auth/session";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { publicProfileSchema } from "../schemas/public-profile.schema";

export const metadata: Metadata = {
  title: "Member profile",
  robots: { index: false, follow: false },
};

/**
 * Validate the route and authenticate before rendering a neutral empty state.
 * No profile lookup is needed while this screen contains no member information;
 * adding actual profile data later must introduce its own authorized repository read.
 */
export async function MemberProfileView({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<React.ReactNode> {
  const parsed = publicProfileSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const session = await getServerSession();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("Fellowships");

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <h1 className="sr-only">{t("memberList.profileTitle")}</h1>
      <NavigationButton
        href="/fellowships"
        pendingLabel={t("opening")}
        variant="secondary"
        className="mb-6 min-h-11"
      >
        <ArrowLeftIcon aria-hidden="true" />
        {t("back")}
      </NavigationButton>
      <EmptyState
        icon={<UserRoundIcon aria-hidden="true" />}
        title={t("memberList.profileTitle")}
        description={t("memberList.profileDescription")}
      />
    </main>
  );
}
