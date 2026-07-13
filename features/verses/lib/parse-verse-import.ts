import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
  MAX_VERSE_IMPORT_BYTES,
  MAX_VERSE_IMPORT_ROWS,
  VERSE_IMPORT_HEADERS,
} from "@/features/verses/constants/verse-import";
import { toVerseWriteData } from "@/features/verses/lib/to-verse-write-data";
import { formatBibleReference } from "@/features/verses/lib/bible-reference";
import { verseFormSchema } from "@/features/verses/schemas/verse.schema";
import type {
  ParsedVerseImportRow,
  VerseImportPreview,
  VerseImportPreviewRow,
} from "@/features/verses/types/verse.types";

const csvRecordSchema = z.record(z.string(), z.string());

export type PreparedVerseImport = {
  preview: VerseImportPreview;
  readyRows: ParsedVerseImportRow[];
};

/** Expected import error that can be safely returned to an administrator. */
export class VerseImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerseImportFileError";
  }
}

function parseBoolean(value: string): boolean | string {
  const normalized = value.trim().toLocaleLowerCase("en");
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return value;
}

function flattenMessages(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((issue) => issue.message))];
}

/**
 * Parses, validates, and classifies a complete CSV payload without writing data.
 * Existing references are compared case-insensitively so cosmetic casing cannot
 * create semantically duplicate Scripture records.
 */
export function prepareVerseImport(
  csvText: string,
  existingReferences: readonly string[],
): PreparedVerseImport {
  if (new TextEncoder().encode(csvText).byteLength > MAX_VERSE_IMPORT_BYTES) {
    throw new VerseImportFileError("The CSV file cannot exceed 1 MB.");
  }

  let parsedRecords: unknown;
  try {
    parsedRecords = parse(csvText, {
      bom: true,
      columns(header: string[]) {
        const matches =
          header.length === VERSE_IMPORT_HEADERS.length &&
          header.every((value, index) => value === VERSE_IMPORT_HEADERS[index]);
        if (!matches) {
          throw new VerseImportFileError(
            `CSV headers must exactly match: ${VERSE_IMPORT_HEADERS.join(", ")}.`,
          );
        }
        return header;
      },
      max_record_size: 100_000,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    if (error instanceof VerseImportFileError) throw error;
    throw new VerseImportFileError(
      "The CSV could not be parsed. Check its quoting, columns, and line endings.",
    );
  }

  const recordsResult = z.array(csvRecordSchema).safeParse(parsedRecords);
  if (!recordsResult.success) {
    throw new VerseImportFileError("The CSV contains an unsupported record shape.");
  }
  if (recordsResult.data.length === 0) {
    throw new VerseImportFileError("Add at least one verse row beneath the CSV header.");
  }
  if (recordsResult.data.length > MAX_VERSE_IMPORT_ROWS) {
    throw new VerseImportFileError(
      `Import no more than ${MAX_VERSE_IMPORT_ROWS} verses at a time.`,
    );
  }

  const knownReferences = new Set(
    existingReferences.map((reference) => reference.trim().toLocaleLowerCase("en")),
  );
  const seenReferences = new Set<string>();
  const previewRows: VerseImportPreviewRow[] = [];
  const readyRows: ParsedVerseImportRow[] = [];

  recordsResult.data.forEach((record, index) => {
    const rowNumber = index + 2;
    const validated = verseFormSchema.safeParse({
      book: record.book,
      chapter: record.chapter,
      verseStart: record.verseStart,
      verseEnd: record.verseEnd,
      reflection: record.reflection,
      studyNote: record.studyNote,
      tags: record.tags,
      isActive: parseBoolean(record.isActive),
      translations: {
        NIV: record.NIV,
        ESV: record.ESV,
        KJV: record.KJV,
      },
    });

    if (!validated.success) {
      previewRows.push({
        rowNumber,
        reference: formatBibleReference(
          record.book || "Unknown book",
          Number(record.chapter) || 0,
          Number(record.verseStart) || 0,
          record.verseEnd ? Number(record.verseEnd) : "",
        ),
        status: "invalid",
        messages: flattenMessages(validated.error),
      });
      return;
    }

    const referenceKey = validated.data.reference.toLocaleLowerCase("en");
    if (knownReferences.has(referenceKey) || seenReferences.has(referenceKey)) {
      previewRows.push({
        rowNumber,
        reference: validated.data.reference,
        status: "duplicate",
        messages: ["This reference already exists or appears earlier in this CSV."],
      });
      return;
    }

    seenReferences.add(referenceKey);
    previewRows.push({
      rowNumber,
      reference: validated.data.reference,
      status: "ready",
      messages: [],
    });
    readyRows.push({ rowNumber, data: toVerseWriteData(validated.data) });
  });

  return {
    preview: {
      rows: previewRows,
      readyCount: readyRows.length,
      duplicateCount: previewRows.filter((row) => row.status === "duplicate").length,
      invalidCount: previewRows.filter((row) => row.status === "invalid").length,
    },
    readyRows,
  };
}
