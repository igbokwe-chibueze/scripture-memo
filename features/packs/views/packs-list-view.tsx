import type { Metadata } from "next";
import Link from "next/link";
import { Edit, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PackStatusAction } from "@/features/packs/components/pack-status-action";
import { getPacksListData } from "@/features/packs/lib/get-packs-list-data";

export const metadata: Metadata = {
  title: "Manage packs | Scripture Memo",
  robots: { index: false, follow: false },
};

type PackRow = Awaited<ReturnType<typeof getPacksListData>>[number];

/** ADMIN-only themed learning-pack library. */
export async function PacksListView(): Promise<React.ReactNode> {
  const packs = await getPacksListData();
  const columns: DataTableColumn<PackRow>[] = [
    { id: "name", header: "Pack", cell: (pack) => <div><p className="font-semibold">{pack.name}</p><p className="text-xs text-muted-foreground">/{pack.slug}</p></div> },
    { id: "description", header: "Description", cell: (pack) => <span className="line-clamp-2 max-w-md text-muted-foreground">{pack.description || "No description"}</span> },
    { id: "verses", header: "Verses", cell: (pack) => pack._count.verses, align: "center" },
    { id: "status", header: "Status", cell: (pack) => <Badge variant={pack.isActive ? "default" : "outline"}>{pack.isActive ? "Published" : "Hidden"}</Badge> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (pack) => (
        <div className="flex justify-end gap-2">
          <Link href={`/admin/packs/${pack.id}/edit`} className={buttonVariants({ variant: "ghost", size: "icon-lg" })} aria-label={`Edit ${pack.name}`}><Edit aria-hidden="true" /></Link>
          <PackStatusAction id={pack.id} name={pack.name} isActive={pack.isActive} publishableVerseCount={pack.verses.filter(({ verse }) => verse.isActive).length} />
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="Learning packs"
          description="Group published verses into focused, ordered learning collections."
          action={<Link href="/admin/packs/new" className={buttonVariants({ size: "lg" })}><Plus aria-hidden="true" /> New pack</Link>}
        />
        <DataTable
          data={packs}
          columns={columns}
          getRowKey={(pack) => pack.id}
          caption="Admin learning pack library"
          emptyState={<EmptyState title="No packs yet" description="Create the first themed collection, then add and order its verses." action={<Link href="/admin/packs/new" className={buttonVariants()}>Create first pack</Link>} />}
        />
      </ResponsiveContainer>
    </main>
  );
}
