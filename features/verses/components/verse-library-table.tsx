"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Columns3Icon, EditIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { VerseStatusAction } from "@/features/verses/components/verse-status-action";
import type {
  JourneyStage,
  TranslationCode,
} from "@/lib/generated/prisma/enums";

const maximumVisibleColumns = 5;

const columnLabels = {
  reference: "Reference",
  book: "Book",
  tags: "Tags",
  translations: "Translations",
  status: "Status",
  waypoints: "Waypoints",
  packs: "Packs",
} as const;

type VerseColumnId = keyof typeof columnLabels;

const defaultVisibleColumns: VerseColumnId[] = [
  "reference",
  "book",
  "tags",
  "translations",
  "status",
];

const journeyStageLabels: Record<JourneyStage, string> = {
  LEARN: "Learn",
  RECALL: "Recall",
  STRENGTHEN: "Strengthen",
  MASTER: "Master",
};

export type VerseLibraryRow = {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  isActive: boolean;
  translations: Array<{
    translation: TranslationCode;
  }>;
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
  waypoints: Array<{
    id: string;
    number: number;
    journeyStage: JourneyStage;
  }>;
  packs: Array<{
    pack: {
      id: string;
      name: string;
    };
  }>;
};

type VerseLibraryTableProps = {
  rows: VerseLibraryRow[];
};

/**
 * Interactive administrative verse table with a bounded column selector.
 *
 * The server still owns filtering, pagination, and database reads. This small
 * client boundary owns only presentation state, preventing a column toggle
 * from causing another database request.
 */
export function VerseLibraryTable({
  rows,
}: VerseLibraryTableProps): React.ReactNode {
  const [visibleColumnIds, setVisibleColumnIds] = useState<VerseColumnId[]>(
    defaultVisibleColumns,
  );

  const allColumns = useMemo<Record<VerseColumnId, DataTableColumn<VerseLibraryRow>>>(
    () => ({
      reference: {
        id: "reference",
        header: "Reference",
        cell: (verse) => (
          <span className="font-semibold">{verse.reference}</span>
        ),
      },
      book: {
        id: "book",
        header: "Book",
        cell: (verse) => `${verse.book} ${verse.chapter}`,
      },
      tags: {
        id: "tags",
        header: "Tags",
        cell: (verse) => (
          <div className="flex flex-wrap gap-1">
            {verse.tags.length > 0
              ? verse.tags.map(({ tag }) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))
              : <span className="text-muted-foreground">None</span>}
          </div>
        ),
      },
      translations: {
        id: "translations",
        header: "Translations",
        cell: (verse) => `${verse.translations.length}/3`,
      },
      status: {
        id: "status",
        header: "Status",
        cell: (verse) => (
          <Badge variant={verse.isActive ? "default" : "outline"}>
            {verse.isActive ? "Published" : "Archived"}
          </Badge>
        ),
      },
      waypoints: {
        id: "waypoints",
        header: "Waypoints",
        cell: (verse) => (
          <div className="flex flex-wrap gap-1">
            {verse.waypoints.length > 0
              ? verse.waypoints.map((waypoint) => (
                  <Badge key={waypoint.id} variant="outline">
                    #{waypoint.number} · {journeyStageLabels[waypoint.journeyStage]}
                  </Badge>
                ))
              : <span className="text-muted-foreground">None</span>}
          </div>
        ),
      },
      packs: {
        id: "packs",
        header: "Packs",
        cell: (verse) => (
          <div className="flex flex-wrap gap-1">
            {verse.packs.length > 0
              ? verse.packs.map(({ pack }) => (
                  <Badge key={pack.id} variant="secondary">
                    {pack.name}
                  </Badge>
                ))
              : <span className="text-muted-foreground">None</span>}
          </div>
        ),
      },
    }),
    [],
  );

  const visibleColumns = visibleColumnIds.map((columnId) => allColumns[columnId]);
  const columns: DataTableColumn<VerseLibraryRow>[] = [
    ...visibleColumns,
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (verse) => (
        <div className="flex justify-end gap-1">
          <Link
            href={`/admin/verses/${verse.id}/edit`}
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
            })}
            aria-label={`Edit ${verse.reference}`}
          >
            <EditIcon aria-hidden="true" />
          </Link>
          <VerseStatusAction id={verse.id} isActive={verse.isActive} />
        </div>
      ),
    },
  ];

  function setColumnVisibility(
    columnId: VerseColumnId,
    shouldShow: boolean,
  ): void {
    setVisibleColumnIds((currentColumns) => {
      if (shouldShow) {
        if (
          currentColumns.includes(columnId) ||
          currentColumns.length >= maximumVisibleColumns
        ) {
          return currentColumns;
        }

        // Preserve the canonical column order regardless of the sequence in
        // which the administrator checks the menu items.
        return (Object.keys(columnLabels) as VerseColumnId[]).filter(
          (candidateId) => (
            currentColumns.includes(candidateId) || candidateId === columnId
          ),
        );
      }

      // At least one information column remains visible so the table cannot
      // become an unexplained column of row-action buttons.
      if (currentColumns.length === 1) return currentColumns;

      return currentColumns.filter((candidateId) => candidateId !== columnId);
    });
  }

  return (
    <section className="space-y-3" aria-label="Verse table options">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
              />
            )}
          >
            <Columns3Icon aria-hidden="true" />
            Columns
            <span className="text-xs text-muted-foreground">
              {visibleColumnIds.length}/{maximumVisibleColumns}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                Show up to {maximumVisibleColumns}
              </DropdownMenuLabel>
              {(Object.keys(columnLabels) as VerseColumnId[]).map((columnId) => {
                const isVisible = visibleColumnIds.includes(columnId);
                const cannotAdd = (
                  !isVisible &&
                  visibleColumnIds.length >= maximumVisibleColumns
                );
                const cannotRemove = isVisible && visibleColumnIds.length === 1;

                return (
                  <DropdownMenuCheckboxItem
                    key={columnId}
                    checked={isVisible}
                    disabled={cannotAdd || cannotRemove}
                    onCheckedChange={(checked) => {
                      setColumnVisibility(columnId, checked);
                    }}
                  >
                    {columnLabels[columnId]}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(verse) => verse.id}
        caption="Admin Scripture verse library"
        emptyState={(
          <EmptyState
            title="No verses found"
            description="Adjust the filters or create the first verse."
            action={(
              <Link href="/admin/verses/new" className={buttonVariants()}>
                Create verse
              </Link>
            )}
          />
        )}
      />
    </section>
  );
}
