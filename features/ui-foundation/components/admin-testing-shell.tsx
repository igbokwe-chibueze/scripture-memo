import type { ReactNode } from "react";
import {
  AccessibilityIcon,
  BlocksIcon,
  Gamepad2Icon,
  FlaskConicalIcon,
  LayoutDashboardIcon,
} from "lucide-react";

import { NavigationButton } from "@/components/shared/navigation-button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

const TESTING_DESTINATIONS = [
  {
    href: "/admin/testing",
    label: "Overview",
    pendingLabel: "Opening overview",
    icon: LayoutDashboardIcon,
  },
  {
    href: "/admin/testing/shared-ui",
    label: "Shared UI",
    pendingLabel: "Opening shared UI",
    icon: BlocksIcon,
  },
  {
    href: "/admin/testing/gameplay",
    label: "Gameplay",
    pendingLabel: "Opening gameplay tests",
    icon: Gamepad2Icon,
  },
  {
    href: "/admin/testing/features",
    label: "Feature checks",
    pendingLabel: "Opening feature checks",
    icon: FlaskConicalIcon,
  },
  {
    href: "/admin/testing/accessibility",
    label: "Accessibility",
    pendingLabel: "Opening accessibility checks",
    icon: AccessibilityIcon,
  },
] as const;

/**
 * Gives every internal test page the same clear title, category navigation,
 * mobile spacing, and administrative surface treatment.
 */
export function AdminTestingShell({
  activePath,
  title,
  description,
  children,
}: {
  activePath: (typeof TESTING_DESTINATIONS)[number]["href"];
  title: string;
  description: string;
  children: ReactNode;
}): ReactNode {
  return (
    <main className="min-h-svh bg-muted/20 py-5 sm:py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow="Admin testing"
          title={title}
          description={description}
        />

        <nav
          aria-label="Testing pages"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        >
          {TESTING_DESTINATIONS.map((destination) => {
            const Icon = destination.icon;
            const isActive = destination.href === activePath;

            return (
              <NavigationButton
                key={destination.href}
                href={destination.href}
                pendingLabel={destination.pendingLabel}
                aria-current={isActive ? "page" : undefined}
                variant={isActive ? "default" : "outline"}
                className="min-h-11 w-full justify-start px-3"
              >
                <Icon aria-hidden="true" />
                {destination.label}
              </NavigationButton>
            );
          })}
        </nav>

        <div className="space-y-6">{children}</div>
      </ResponsiveContainer>
    </main>
  );
}
