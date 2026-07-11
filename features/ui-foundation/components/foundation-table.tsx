"use client";

import { useMemo, useState } from "react";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { StatusBadge } from "@/components/shared/status-badge";

type FoundationRecord = {
  id: string;
  component: string;
  status: string;
};

const foundationRecords: FoundationRecord[] = [
  { id: "shared", component: "Shared components", status: "Ready" },
  { id: "table", component: "Data table foundation", status: "Ready" },
  { id: "theme", component: "Theme system", status: "Ready" },
];

const columns: DataTableColumn<FoundationRecord>[] = [
  {
    id: "component",
    header: "Foundation area",
    cell: (row) => <span className="font-medium">{row.component}</span>,
  },
  {
    id: "status",
    header: "Status",
    align: "right",
    cell: (row) => <StatusBadge status={row.status} tone="success" />,
  },
];

/**
 * Exercises the generic Phase 2 table family with controlled filtering and paging.
 *
 * The records are static because this route is a UI verification surface, not a
 * data feature. Real tables will perform filtering and pagination in repositories
 * and preserve the same controlled toolbar and pagination contracts.
 */
export function FoundationTable(): React.ReactNode {
  const [searchValue, setSearchValue] = useState("");

  const filteredRecords = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return foundationRecords;

    return foundationRecords.filter((record) =>
      record.component.toLowerCase().includes(query),
    );
  }, [searchValue]);

  return (
    <section className="space-y-3" aria-labelledby="table-foundation-title">
      <h2 id="table-foundation-title" className="font-heading text-xl font-bold">
        Data table checks
      </h2>
      <DataTableToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search foundation areas"
      />
      <DataTable
        data={filteredRecords}
        columns={columns}
        getRowKey={(row) => row.id}
        caption="Phase 2 foundation readiness"
      />
      <DataTablePagination page={1} pageCount={1} totalItems={filteredRecords.length} onPageChange={() => undefined} />
    </section>
  );
}
