import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { requireServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { NavigationButton } from "@/components/shared/navigation-button";
import { OilShop } from "@/features/oil-shop/components/oil-shop";
import { oilShopRepository } from "@/features/oil-shop/repositories/oil-shop.repository";

export const metadata: Metadata = {
  title: "Shop | Scripture Memo",
  description: "Spend earned Glow Points on helpful supplies for your Scripture journey.",
  robots: { index: false, follow: false },
};

type OilShopSearchParameters = {
  tab?: string;
};

/** Loads the authenticated learner's private marketplace and balances. */
export async function OilShopView({
  searchParams,
}: {
  searchParams: Promise<OilShopSearchParameters>;
}): Promise<React.ReactNode> {
  const t = await getTranslations("Shop");
  const session = await requireServerSession();
  const [data, parameters] = await Promise.all([
    oilShopRepository.getShopData(session.user.id),
    searchParams,
  ]);
  const initialTab = parameters.tab === "donations" || parameters.tab === "avatars"
    ? parameters.tab : "hints";

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <NavigationButton
          href="/game"
          pendingLabel={t("journeyHome")}
          variant="secondary"
          className="min-h-11 gap-2 px-4"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {t("journeyHome")}
        </NavigationButton>
        <div className="mt-6" />
        <OilShop
          initialData={data}
          initialTab={initialTab}
          isAdministrator={isAdmin(
            session.user.role as UserRole | undefined,
          )}
        />
      </div>
    </main>
  );
}
