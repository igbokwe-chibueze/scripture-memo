import type { Metadata } from "next";
import {
  AwardIcon,
  BookOpenIcon,
  CircleGaugeIcon,
  Clock3Icon,
  MapPinnedIcon,
  PackageOpenIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { NavigationButton } from "@/components/shared/navigation-button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { adminRepository } from "@/features/admin/repositories/admin.repository";
import { isSuperAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Admin control center | Scripture Memo",
  robots: { index: false, follow: false },
};

const ADMIN_DESTINATIONS = [
  {
    href: "/admin/verses",
    label: "Verses",
    description: "Build and publish the Scripture library.",
    icon: BookOpenIcon,
  },
  {
    href: "/admin/packs",
    label: "Packs",
    description: "Arrange themed collections and ordering.",
    icon: PackageOpenIcon,
  },
  {
    href: "/admin/waypoints",
    label: "Waypoints",
    description: "Control the permanent curriculum trail.",
    icon: MapPinnedIcon,
  },
  {
    href: "/admin/badges",
    label: "Badges",
    description: "Manage achievements and unlock rules.",
    icon: AwardIcon,
  },
  {
    href: "/admin/error-reference",
    label: "Error guide",
    description: "Look up safe operational error codes.",
    icon: CircleGaugeIcon,
  },
] as const;

/** Composes the low-query administrator landing page and permission-aware tools. */
export async function AdminDashboardView(): Promise<React.ReactNode> {
  const session = await getAdminSession();
  const role = session.user.role as UserRole | undefined;
  const stats = await adminRepository.getDashboardStats(new Date());
  const isSuper = isSuperAdmin(role);

  return (
    <main className="min-h-svh bg-muted/20 py-6 sm:py-8">
      <ResponsiveContainer size="xl" className="space-y-7">
        <PageHeader
          eyebrow="Administration"
          title="Control center"
          description="One clear view of the curriculum, achievements, and player community."
          action={
            <div className="inline-flex min-h-11 items-center gap-2 rounded-2xl border bg-card px-3 text-sm font-bold">
              <ShieldCheckIcon className="size-5 text-primary" aria-hidden="true" />
              {isSuper ? "Super Admin" : "Admin"}
            </div>
          }
        />

        <section aria-labelledby="admin-stats-title" className="space-y-3">
          <h2 id="admin-stats-title" className="font-heading text-xl font-black">
            Platform pulse
          </h2>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Users" value={stats.totalUsers} icon={<UsersIcon />} />
            <StatCard label="Verses" value={stats.totalVerses} icon={<BookOpenIcon />} />
            <StatCard
              label="Assigned"
              value={stats.assignedWaypoints}
              icon={<MapPinnedIcon />}
              supportingText="Waypoints with verses"
            />
            <StatCard label="Badges" value={stats.totalBadges} icon={<AwardIcon />} />
            <StatCard
              label="Recently active"
              value={stats.recentlyActiveUsers}
              icon={<Clock3Icon />}
              supportingText="Last 30 days"
              className="min-[420px]:col-span-2 lg:col-span-1"
            />
          </div>
        </section>

        <section aria-labelledby="admin-tools-title" className="space-y-3">
          <div>
            <h2 id="admin-tools-title" className="font-heading text-xl font-black">
              Admin tools
            </h2>
            <p className="text-sm text-muted-foreground">
              Open a focused workspace for the task at hand.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ADMIN_DESTINATIONS.map((destination) => {
              const Icon = destination.icon;
              return (
                <article
                  key={destination.href}
                  className="flex min-w-0 flex-col rounded-3xl border bg-card p-4"
                >
                  <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading text-lg font-black">{destination.label}</h3>
                  <p className="mt-1 grow text-sm leading-6 text-muted-foreground">
                    {destination.description}
                  </p>
                  <NavigationButton
                    href={destination.href}
                    pendingLabel={`Opening ${destination.label}`}
                    className="mt-5 w-full"
                  >
                    Open {destination.label}
                  </NavigationButton>
                </article>
              );
            })}

            {isSuper && (
              <>
                <article className="flex min-w-0 flex-col rounded-3xl border border-primary/30 bg-primary/5 p-4">
                  <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                    <UsersIcon className="size-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading text-lg font-black">Users</h3>
                  <p className="mt-1 grow text-sm leading-6 text-muted-foreground">
                    Search accounts, change roles, and control access.
                  </p>
                  <NavigationButton
                    href="/admin/users"
                    pendingLabel="Opening users"
                    className="mt-5 w-full"
                  >
                    Manage users
                  </NavigationButton>
                </article>

                <article className="flex min-w-0 flex-col rounded-3xl border bg-card p-4">
                  <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <SettingsIcon className="size-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading text-lg font-black">Settings</h3>
                  <p className="mt-1 grow text-sm leading-6 text-muted-foreground">
                    Review the current account and experience preferences.
                  </p>
                  <NavigationButton
                    href="/settings"
                    pendingLabel="Opening settings"
                    variant="outline"
                    className="mt-5 w-full"
                  >
                    Open settings
                  </NavigationButton>
                </article>
              </>
            )}
          </div>
        </section>
      </ResponsiveContainer>
    </main>
  );
}
