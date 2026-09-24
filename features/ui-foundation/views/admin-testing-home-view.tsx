import type { Metadata } from "next";
import {
  AccessibilityIcon,
  BlocksIcon,
  FlaskConicalIcon,
  Gamepad2Icon,
} from "lucide-react";

import { NavigationButton } from "@/components/shared/navigation-button";
import { AdminTestingShell } from "@/features/ui-foundation/components/admin-testing-shell";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Admin testing | Scripture Memo",
  description: "Focused visual and interaction checks for Scripture Memo.",
  robots: { index: false, follow: false },
};

const TESTING_AREAS = [
  {
    href: "/admin/testing/shared-ui",
    pendingLabel: "Opening shared UI",
    title: "Shared UI",
    description:
      "Review game buttons, common controls, data tables, loading, errors, and Luna.",
    icon: BlocksIcon,
  },
  {
    href: "/admin/testing/gameplay",
    pendingLabel: "Opening gameplay tests",
    title: "Gameplay",
    description:
      "Inspect Day Selection, the gameplay shell, and progression celebrations.",
    icon: Gamepad2Icon,
  },
  {
    href: "/admin/testing/features",
    pendingLabel: "Opening feature checks",
    title: "Feature checks",
    description:
      "Run prepared scenarios for Notifications, Vault, Fellowships, Shop, Settings, and Sanctuary.",
    icon: FlaskConicalIcon,
  },
  {
    href: "/admin/testing/accessibility",
    pendingLabel: "Opening accessibility checks",
    title: "Accessibility",
    description:
      "Check operating-system and saved in-app Reduced Motion behavior.",
    icon: AccessibilityIcon,
  },
] as const;

/** Shows administrators the focused internal review areas and their purpose. */
export async function AdminTestingHomeView(): Promise<React.ReactNode> {
  await getAdminSession();

  return (
    <AdminTestingShell
      activePath="/admin/testing"
      title="Testing workspaces"
      description="Open a focused preview for visual review and repeatable feature checks. These scenarios use sample data and avoid setting up game progress."
    >
      <section aria-label="Testing areas" className="grid gap-3 sm:grid-cols-2">
        {TESTING_AREAS.map((area) => {
          const Icon = area.icon;

          return (
            <article
              key={area.href}
              className="flex min-w-0 flex-col rounded-3xl border bg-card p-5 shadow-sm"
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-6" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-heading text-xl font-black">{area.title}</h2>
              <p className="mt-2 grow text-sm leading-6 text-muted-foreground">
                {area.description}
              </p>
              <NavigationButton
                href={area.href}
                pendingLabel={area.pendingLabel}
                className="mt-5 min-h-11 w-full"
              >
                Open {area.title}
              </NavigationButton>
            </article>
          );
        })}
      </section>
    </AdminTestingShell>
  );
}
