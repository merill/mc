"use client"
import "./table.css"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import React from "react"
import Link from "next/link"
import { MessageArchive } from "@/types/message"
import { MessageView } from "@/app/messages-table/columns"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  archiveUrl?: string
}

function toMessageView(item: MessageArchive): MessageView {
  const d = item.LastModifiedDateTime ? new Date(item.LastModifiedDateTime) : null;
  const lastUpdated = d
    ? `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}, ${d.getFullYear()}`
    : undefined;
  return {
    id: item.Id,
    title: item.Title,
    service: item.Services,
    lastUpdated,
    isMajor: item.IsMajorChange ?? false,
    isArchived: true,
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  archiveUrl,
}: DataTableProps<TData, TValue>) {

  const [allData, setAllData] = React.useState<TData[]>(data)
  const [archiveLoaded, setArchiveLoaded] = React.useState(false)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  React.useEffect(() => {
    if (!archiveUrl || archiveLoaded) return;
    fetch(archiveUrl)
      .then((res) => res.json())
      .then((items: MessageArchive[]) => {
        const archiveRows = items.map(toMessageView) as unknown as TData[];
        setAllData((prev) => [...prev, ...archiveRows]);
        setArchiveLoaded(true);
      })
      .catch(() => {
        // Archive fetch is best-effort; silently ignore errors
      });
  }, [archiveUrl, archiveLoaded])

  const table = useReactTable({
    data: allData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div>
      <div className="flex items-center py-4 gap-3">
        <Input
          placeholder="Filter by ID..."
          value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("id")?.setFilterValue(event.target.value)
          }
          className="max-w-40"
        />
        <Input
          placeholder="Filter by Title..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="max-w-80"
        />

      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>

                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
                <TableHead key="url" aria-label="Detail Page Link"></TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >

                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  <TableCell><Link className="row-link" href={`/message/${row.getValue("id")}`}></Link></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
