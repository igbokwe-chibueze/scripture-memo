"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingButton } from "@/components/shared/loading-button";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { assignVerseToWaypointAction } from "@/features/waypoints/actions/assign-verse-to-waypoint.action";
import type { JourneyStage } from "@/lib/generated/prisma/enums";

const stageOptions: { value: JourneyStage; label: string }[] = [
  { value: "LEARN", label: "Learn" },
  { value: "RECALL", label: "Recall" },
  { value: "STRENGTHEN", label: "Strengthen" },
  { value: "MASTER", label: "Master" },
];

export type WaypointAssignmentDialogProps = {
  waypointId: string;
  waypointNumber: number;
  initialVerseId: string;
  initialJourneyStage: JourneyStage;
  publishedVerses: { id: string; reference: string; book: string }[];
  disabled?: boolean;
};

/** Edits the inseparable verse and Journey Stage assignment for one slot. */
export function WaypointAssignmentDialog({
  waypointId,
  waypointNumber,
  initialVerseId,
  initialJourneyStage,
  publishedVerses,
  disabled = false,
}: WaypointAssignmentDialogProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [verseId, setVerseId] = useState(initialVerseId);
  const [journeyStage, setJourneyStage] = useState<JourneyStage>(initialJourneyStage);
  const [isPending, startTransition] = useTransition();
  const verseOptions = publishedVerses.map((verse) => ({
    value: verse.id,
    label: `${verse.reference} · ${verse.book}`,
  }));

  function saveAssignment(): void {
    if (!verseId) return;
    startTransition(async () => {
      const result = await assignVerseToWaypointAction({ waypointId, verseId, journeyStage });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else toast.error(result.message, { duration: Infinity });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="min-h-11" disabled={disabled} />
        }
      >
        <Pencil aria-hidden="true" /> {initialVerseId ? "Edit" : "Assign"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure waypoint {waypointNumber}</DialogTitle>
          <DialogDescription>
            Choose a published verse and explicitly define this appearance&apos;s Journey Stage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Published verse</p>
            <SearchableSelect
              value={verseId}
              options={verseOptions}
              onValueChange={setVerseId}
              label={`Verse for waypoint ${waypointNumber}`}
              placeholder={verseOptions.length ? "Search published verses" : "No published verses available"}
              searchPlaceholder="Search by reference or book…"
              emptyMessage="No published verse matches your search."
              disabled={isPending || verseOptions.length === 0}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Journey Stage</p>
            <Select value={journeyStage} onValueChange={(value) => setJourneyStage(value as JourneyStage)} disabled={isPending}>
              <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {stageOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={isPending} />}>
            Close
          </DialogClose>
          <LoadingButton type="button" isPending={isPending} pendingLabel="Saving assignment" disabled={!verseId} onClick={saveAssignment}>
            Save assignment
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
