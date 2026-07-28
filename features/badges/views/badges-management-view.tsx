import type { Metadata } from "next";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { requireServerSession } from "@/lib/auth/session";
import { isAdmin, isSuperAdmin } from "@/lib/permissions";
import { badgeRepository } from "@/features/badges/repositories/badge.repository";
import { BadgeAdminManager } from "@/features/badges/components/badge-admin-manager";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Manage badges | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Protects and composes the administrator badge catalogue surface. */
export async function BadgesManagementView(): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const role = session.user.role as UserRole | undefined;
  if (!isAdmin(role)) redirect("/game");
  const badges = await badgeRepository.findAllForAdmin();

  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="Badge system"
          description="Review the achievement catalogue, pause evaluation, and issue audited manual grants."
        />
        <BadgeAdminManager badges={badges} canAward={isSuperAdmin(role)} />
      </ResponsiveContainer>
    </main>
  );
}
