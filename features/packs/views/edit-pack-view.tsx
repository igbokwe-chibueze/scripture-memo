import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PackForm } from "@/features/packs/components/pack-form";
import { PackStatusAction } from "@/features/packs/components/pack-status-action";
import { PackVerseManager } from "@/features/packs/components/pack-verse-manager";
import { getPackEditData } from "@/features/packs/lib/get-pack-edit-data";

export const metadata: Metadata = { title: "Edit pack | Scripture Memo", robots: { index: false, follow: false } };

/** ADMIN-only pack metadata, membership, ordering, and visibility composition. */
export async function EditPackView({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactNode> {
  const { pack, availableVerses } = await getPackEditData((await params).id);
  if (!pack) notFound();
  const publishedVerseCount = pack.verses.filter(({ verse }) => verse.isActive).length;
  const managerKey = pack.verses.map(({ verseId, position }) => `${verseId}:${position}`).join("|");

  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="lg" className="space-y-6">
        <PageHeader
          eyebrow="Learning packs"
          title={pack.name}
          description="Manage metadata, membership, ordering, and learner visibility."
          action={<div className="flex items-center gap-2"><Badge variant={pack.isActive ? "default" : "outline"}>{pack.isActive ? "Published" : "Hidden"}</Badge><PackStatusAction id={pack.id} name={pack.name} isActive={pack.isActive} publishableVerseCount={publishedVerseCount} /></div>}
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Card className="h-fit">
            <CardHeader><CardTitle>Pack details</CardTitle></CardHeader>
            <CardContent><PackForm mode="edit" initialValues={{ id: pack.id, name: pack.name, description: pack.description ?? "" }} /></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ordered verses</CardTitle>
              <p className="text-sm text-muted-foreground">Drag with pointer or touch, use the keyboard handle, or use arrow buttons to set learning order.</p>
            </CardHeader>
            <CardContent>
              <PackVerseManager key={managerKey} packId={pack.id} initialItems={pack.verses} availableVerses={availableVerses} />
            </CardContent>
          </Card>
        </div>
      </ResponsiveContainer>
    </main>
  );
}
