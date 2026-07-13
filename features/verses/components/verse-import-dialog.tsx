"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileCheck2, FileUp, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";
import { importVersesAction } from "@/features/verses/actions/import-verses.action";
import { previewVerseImportAction } from "@/features/verses/actions/preview-verse-import.action";
import {
  MAX_VERSE_IMPORT_BYTES,
  MAX_VERSE_IMPORT_ROWS,
  VERSE_IMPORT_TEMPLATE,
} from "@/features/verses/constants/verse-import";
import type { VerseImportPreview } from "@/features/verses/types/verse.types";

type PendingOperation = "preview" | "import" | null;

function statusBadge(status: "ready" | "duplicate" | "invalid"): React.ReactNode {
  if (status === "ready") return <Badge>Ready</Badge>;
  if (status === "duplicate") return <Badge variant="outline">Duplicate</Badge>;
  return <Badge variant="destructive">Invalid</Badge>;
}

/** Admin CSV upload, validation preview, and explicit import confirmation flow. */
export function VerseImportDialog(): React.ReactNode {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<VerseImportPreview | null>(null);
  const [pendingOperation, setPendingOperation] = useState<PendingOperation>(null);
  const [isPending, startTransition] = useTransition();

  function resetImport(): void {
    setCsvText("");
    setFileName("");
    setPreview(null);
    setPendingOperation(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(open: boolean): void {
    setIsOpen(open);
    if (!open) resetImport();
  }

  function downloadTemplate(): void {
    const url = URL.createObjectURL(new Blob([VERSE_IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "scripture-memo-verse-import.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File | undefined): Promise<void> {
    setPreview(null);
    setCsvText("");
    setFileName(file?.name ?? "");
    if (!file) return;

    if (!file.name.toLocaleLowerCase("en").endsWith(".csv")) {
      toast.error("Choose a CSV file.", { duration: Infinity });
      return;
    }
    if (file.size > MAX_VERSE_IMPORT_BYTES) {
      toast.error("The CSV file cannot exceed 1 MB.", { duration: Infinity });
      return;
    }

    const text = await file.text();
    setCsvText(text);
    setPendingOperation("preview");
    startTransition(async () => {
      const result = await previewVerseImportAction({ csvText: text });
      setPendingOperation(null);
      if (!result.success || !result.data) {
        toast.error(result.message, { duration: Infinity });
        return;
      }
      setPreview(result.data);
      toast.success(result.message);
    });
  }

  function confirmImport(): void {
    if (!preview?.readyCount || !csvText) return;

    setPendingOperation("import");
    startTransition(async () => {
      const result = await importVersesAction({ csvText });
      setPendingOperation(null);
      if (!result.success) {
        toast.error(result.message, { duration: Infinity });
        return;
      }

      const skipped = (result.data?.duplicateCount ?? 0) + (result.data?.invalidCount ?? 0);
      toast.success(result.message, {
        description: skipped ? `${skipped} duplicate or invalid rows were skipped.` : undefined,
      });
      setIsOpen(false);
      resetImport();
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="lg" />}>
        <FileUp aria-hidden="true" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk import verses</DialogTitle>
          <DialogDescription>
            Preview up to {MAX_VERSE_IMPORT_ROWS} verses before saving. Existing references and repeated CSV rows are skipped, never overwritten.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Start with the required template</p>
              <p className="text-xs text-muted-foreground">Keep the exact headers. Quote fields containing commas or line breaks.</p>
            </div>
            <Button type="button" variant="outline" className="min-h-11" onClick={downloadTemplate}>
              <Download aria-hidden="true" />
              Download template
            </Button>
          </div>

          <div className="grid gap-2">
            <label htmlFor="verse-import-file" className="font-medium">CSV file</label>
            <Input
              ref={fileInputRef}
              id="verse-import-file"
              type="file"
              accept=".csv,text/csv"
              className="min-h-11 py-2"
              disabled={isPending}
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <p className="text-xs text-muted-foreground">Maximum 1 MB. NIV, ESV, and KJV text are required for every valid row.</p>
          </div>

          {isPending && pendingOperation === "preview" && (
            <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed text-muted-foreground" aria-live="polite">
              Reviewing {fileName || "CSV file"}…
            </div>
          )}

          {preview && (
            <section className="grid gap-3" aria-labelledby="verse-import-preview-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="verse-import-preview-title" className="font-semibold">Import preview</h3>
                <div className="flex flex-wrap gap-2" aria-label="Import totals">
                  <Badge>{preview.readyCount} ready</Badge>
                  <Badge variant="outline">{preview.duplicateCount} duplicate</Badge>
                  <Badge variant={preview.invalidCount ? "destructive" : "outline"}>{preview.invalidCount} invalid</Badge>
                </div>
              </div>

              <div className="max-h-80 overflow-auto rounded-xl border">
                <table className="w-full min-w-xl text-left text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Reference</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.rows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-3 py-2 tabular-nums">{row.rowNumber}</td>
                        <td className="px-3 py-2 font-medium">{row.reference}</td>
                        <td className="px-3 py-2">{statusBadge(row.status)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.messages.join(" ") || "Ready to import."}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(preview.duplicateCount > 0 || preview.invalidCount > 0) && (
                <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Duplicate and invalid rows will be skipped. Only rows marked Ready will be saved.
                </div>
              )}
            </section>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" disabled={isPending} onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            isPending={isPending && pendingOperation === "import"}
            pendingLabel="Importing verses"
            disabled={!preview?.readyCount || isPending}
            onClick={confirmImport}
          >
            <FileCheck2 aria-hidden="true" />
            Import {preview?.readyCount ?? 0} ready verses
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
