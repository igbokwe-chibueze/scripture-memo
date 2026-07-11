import type { Metadata } from "next";
import { BookOpenIcon, FlameIcon, HomeIcon, MapIcon, SparklesIcon } from "lucide-react";

import { AppShell } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { FoundationControls } from "@/features/ui-foundation/components/foundation-controls";
import { FoundationTable } from "@/features/ui-foundation/components/foundation-table";

export const metadata: Metadata = {
  title: "UI Foundation Preview | Scripture Memo",
  description: "Internal verification surface for Scripture Memo shared components.",
  robots: { index: false, follow: false },
};

const previewNavigation = [
  { href: "/", label: "Home", icon: <HomeIcon /> },
  { href: "/ui-foundation", label: "Preview", icon: <SparklesIcon /> },
];

/**
 * Renders the internal Phase 2 acceptance surface at a real Next.js route.
 *
 * The route is noindex because it documents implementation rather than public
 * product content. It intentionally composes every custom shared family so build
 * and runtime verification catch invalid composition across server/client bounds.
 */
export function UiFoundationView(): React.ReactNode {
  return (
    <AppShell
      navigationItems={previewNavigation}
      brand={
        <span className="inline-flex items-center gap-2">
          <BookOpenIcon className="size-5 text-primary" aria-hidden="true" />
          Scripture Memo
        </span>
      }
    >
      <ResponsiveContainer className="space-y-10 py-8">
        <PageHeader
          eyebrow={<StatusBadge status="Phase 2" tone="spiritual" />}
          title="Global UI Foundation"
          description="A mobile-first game interface foundation for the Scripture journey."
          action={<LoadingSpinner label="Foundation ready" />}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Shared blocks" value="12" icon={<SparklesIcon />} />
          <StatCard label="UI primitives" value="20" icon={<BookOpenIcon />} />
          <StatCard label="Journey flame" value="1" icon={<FlameIcon />} />
          <StatCard label="Preview route" value="Ready" icon={<MapIcon />} />
        </div>

        <FoundationControls />
        <FoundationTable />

        <EmptyState
          icon={<MapIcon />}
          title="Gameplay features come next"
          description="This state confirms the reusable empty-state treatment before real journey data exists."
        />
      </ResponsiveContainer>
    </AppShell>
  );
}
