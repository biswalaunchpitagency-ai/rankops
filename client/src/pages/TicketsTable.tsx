import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  type ColumnDef,
  type SortingState,
  type PaginationState,
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { type Ticket } from "core/constants/ticket.ts";
import { categoryLabel } from "core/constants/ticket-category.ts";
import ErrorAlert from "@/components/ErrorAlert";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { TicketFilters } from "./TicketsPage";

interface TicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

const columns: ColumnDef<Ticket>[] = [
  {
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        className="font-sans font-medium text-foreground hover:text-primary transition-colors text-[14px]"
      >
        {row.original.subject}
      </Link>
    ),
  },
  {
    accessorKey: "senderName",
    header: "Sender",
    cell: ({ row }) => (
      <div className="font-sans">
        <div className="font-medium text-foreground text-[13px]">{row.original.senderName}</div>
        <div className="text-[12px] text-muted-foreground mt-0.5">
          {row.original.senderEmail}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) =>
      row.original.category ? (
        <span className="inline-flex items-center rounded-sm bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border">
          {categoryLabel[row.original.category]}
        </span>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="font-mono text-[12px] text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  },
];

const PAGE_SIZE = 10;

export default function TicketsTable({ filters }: { filters: TicketFilters }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [filters]);

  const sortBy = sorting[0]?.id ?? "createdAt";
  const sortOrder = sorting[0]?.desc ?? true ? "desc" : "asc";

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tickets", sortBy, sortOrder, filters, pagination.pageIndex],
    queryFn: async () => {
      const { data } = await axios.get<TicketsResponse>("/api/tickets", {
        params: {
          sortBy,
          sortOrder,
          ...filters,
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
        },
      });
      return data;
    },
  });

  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / pagination.pageSize);

  const table = useReactTable({
    data: data?.tickets ?? [],
    columns,
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    manualSorting: true,
    manualPagination: true,
    enableMultiSort: false,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
  });

  if (error) {
    return <ErrorAlert message="Failed to fetch tickets" />;
  }

  return (
    <div className="font-sans space-y-4">
      <div className="border border-border rounded-sm overflow-hidden bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-secondary/40 border-b border-border hover:bg-secondary/40">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-2.5 px-4 h-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground hover:bg-transparent"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUp className="ml-1.5 h-3 w-3 text-primary" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowDown className="ml-1.5 h-3 w-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40 hover:opacity-100" />
                      )}
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-border/50">
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-4 w-48 rounded-sm" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-4 w-40 rounded-sm" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-5 w-16 rounded-sm" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-5 w-24 rounded-sm" />
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Skeleton className="h-4 w-24 rounded-sm" />
                    </TableCell>
                  </TableRow>
                ))
              : table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3.5 px-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {!isLoading && !error && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-mono text-muted-foreground">
            {total === 0
              ? "No tickets"
              : `Showing ${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, total)} of ${total} tickets`}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm border border-border bg-background hover:bg-secondary text-foreground transition-all duration-200 active:scale-95 shadow-none cursor-pointer"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm border border-border bg-background hover:bg-secondary text-foreground transition-all duration-200 active:scale-95 shadow-none cursor-pointer"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono px-3 text-muted-foreground">
              Page {pagination.pageIndex + 1} of {pageCount || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm border border-border bg-background hover:bg-secondary text-foreground transition-all duration-200 active:scale-95 shadow-none cursor-pointer"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm border border-border bg-background hover:bg-secondary text-foreground transition-all duration-200 active:scale-95 shadow-none cursor-pointer"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
