"use client";

import { useState, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingButton } from "@/components/shared/loading-button";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { addVerseToPackAction } from "@/features/packs/actions/add-verse-to-pack.action";
import { removeVerseFromPackAction } from "@/features/packs/actions/remove-verse-from-pack.action";
import { reorderPackVersesAction } from "@/features/packs/actions/reorder-pack-verses.action";

export type PackVerseItem = {
  verseId: string;
  position: number;
  verse: {
    id: string;
    reference: string;
    book: string;
    isActive: boolean;
  };
};

export type AvailablePackVerse = {
  id: string;
  reference: string;
  book: string;
};

type SortablePackVerseProps = {
  item: PackVerseItem;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (verseId: string) => void;
};

/** One keyboard, pointer, and touch-sortable verse row. */
function SortablePackVerse({ item, index, total, disabled, onMove, onRemove }: SortablePackVerseProps): React.ReactNode {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.verseId,
    disabled,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-xl border bg-card p-2.5 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="cursor-grab touch-none active:cursor-grabbing"
        disabled={disabled}
        aria-label={`Reorder ${item.verse.reference}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" />
      </Button>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.verse.reference}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{item.verse.book}</span>
          {!item.verse.isActive && <Badge variant="outline">Archived verse</Badge>}
        </div>
      </div>
      <div className="hidden gap-1 sm:flex">
        <Button type="button" variant="ghost" size="icon-lg" disabled={disabled || index === 0} aria-label={`Move ${item.verse.reference} up`} onClick={() => onMove(index, index - 1)}><ArrowUp aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon-lg" disabled={disabled || index === total - 1} aria-label={`Move ${item.verse.reference} down`} onClick={() => onMove(index, index + 1)}><ArrowDown aria-hidden="true" /></Button>
      </div>
      <ConfirmationDialog
        title={`Remove ${item.verse.reference}?`}
        description="The verse remains in the Scripture library. If this is the final verse, the pack will be hidden automatically."
        confirmLabel="Remove verse"
        destructive
        isConfirmDisabled={disabled}
        trigger={<Button type="button" variant="ghost" size="icon-lg" disabled={disabled} aria-label={`Remove ${item.verse.reference}`}><Trash2 aria-hidden="true" /></Button>}
        onConfirm={() => onRemove(item.verseId)}
      />
    </li>
  );
}

export type PackVerseManagerProps = {
  packId: string;
  initialItems: PackVerseItem[];
  availableVerses: AvailablePackVerse[];
};

/** Adds, removes, and persistently reorders the verses belonging to one pack. */
export function PackVerseManager({ packId, initialItems, availableVerses }: PackVerseManagerProps): React.ReactNode {
  const [items, setItems] = useState(initialItems);
  const [selectedVerseId, setSelectedVerseId] = useState("");
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const verseOptions = availableVerses.map((verse) => ({
    value: verse.id,
    label: `${verse.reference} · ${verse.book}`,
  }));

  function persistOrder(nextItems: PackVerseItem[], previousItems: PackVerseItem[]): void {
    setItems(nextItems);
    startTransition(async () => {
      const result = await reorderPackVersesAction({
        packId,
        orderedVerseIds: nextItems.map((item) => item.verseId),
      });
      if (result.success) toast.success(result.message);
      else {
        setItems(previousItems);
        toast.error(result.message, { duration: Infinity });
      }
    });
  }

  function moveItem(from: number, to: number): void {
    if (to < 0 || to >= items.length || from === to) return;
    persistOrder(arrayMove(items, from, to), items);
  }

  function handleDragEnd(event: DragEndEvent): void {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = items.findIndex((item) => item.verseId === event.active.id);
    const newIndex = items.findIndex((item) => item.verseId === event.over?.id);
    if (oldIndex >= 0 && newIndex >= 0) moveItem(oldIndex, newIndex);
  }

  function addVerse(): void {
    if (!selectedVerseId) return;
    startTransition(async () => {
      const result = await addVerseToPackAction({ packId, verseId: selectedVerseId });
      if (result.success) {
        setSelectedVerseId("");
        toast.success(result.message);
      } else toast.error(result.message, { duration: Infinity });
    });
  }

  function removeVerse(verseId: string): void {
    startTransition(async () => {
      const result = await removeVerseFromPackAction({ packId, verseId });
      if (result.success) {
        setItems((current) => current.filter((item) => item.verseId !== verseId));
        toast.success(result.message);
      } else toast.error(result.message, { duration: Infinity });
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-xl border bg-muted/25 p-4 sm:grid-cols-[1fr_auto]">
        <SearchableSelect
          value={selectedVerseId}
          options={verseOptions}
          label="Published verse to add"
          placeholder={verseOptions.length ? "Search published verses" : "No published verses available"}
          searchPlaceholder="Search by reference or book…"
          emptyMessage="No available verse matches your search."
          disabled={isPending || verseOptions.length === 0}
          onValueChange={setSelectedVerseId}
        />
        <LoadingButton type="button" isPending={isPending} pendingLabel="Updating pack" disabled={!selectedVerseId} onClick={addVerse}>
          <Plus aria-hidden="true" /> Add verse
        </LoadingButton>
      </div>

      {items.length === 0 ? (
        <EmptyState title="This pack is empty" description="Add at least one published verse before the pack can be published." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((item) => item.verseId)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2" aria-label="Ordered pack verses">
              {items.map((item, index) => (
                <SortablePackVerse key={item.verseId} item={item} index={index} total={items.length} disabled={isPending} onMove={moveItem} onRemove={removeVerse} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
