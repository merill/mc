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
import { Button } from "@/components/ui/button"
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

type SourceFilter = "all" | "messageCenter" | "roadmap"
type ServiceFilter = "all" | string

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const getColumnClassName = (columnId: string) => {
    if (columnId === "service" || columnId === "lastUpdated") {
      return "hidden md:table-cell"
    }

    if (columnId === "id") {
      return "w-[7.5rem]"
    }

    if (columnId === "title") {
      return "pl-4 md:pl-4"
    }

    return ""
  }

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>("all")
  const [serviceFilter, setServiceFilter] = React.useState<ServiceFilter>("all")
  const services = React.useMemo(() => {
    const values = new Set<string>()

    data.forEach((item) => {
      ;((item as { service?: string[] }).service || []).forEach((service) => {
        values.add(service)
      })
    })

    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [data])
  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      const sourceMatches = sourceFilter === "all" || (item as { source?: string }).source === sourceFilter
      const serviceMatches = serviceFilter === "all" || ((item as { service?: string[] }).service || []).includes(serviceFilter)

      return sourceMatches && serviceMatches
    })
  }, [data, serviceFilter, sourceFilter])

  const table = useReactTable({
    data: filteredData,
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
      <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={sourceFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("all")}
          >
            All
          </Button>
          <Button
            type="button"
            variant={sourceFilter === "messageCenter" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("messageCenter")}
          >
            Message Center
          </Button>
          <Button
            type="button"
            variant={sourceFilter === "roadmap" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("roadmap")}
          >
            Microsoft 365 Roadmap
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(12rem,20rem)_minmax(12rem,18rem)] lg:flex lg:items-center">
          <Input
            placeholder="Filter by ID..."
            value={(table.getColumn("id")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("id")?.setFilterValue(event.target.value)
            }
          />
          <Input
            placeholder="Filter by Title..."
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
          />
          <select
            aria-label="Filter by Service"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All services</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="rounded-md border">
        <Table className="table-fixed md:table-auto">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>

                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className={`${getColumnClassName(header.column.id)} px-2 md:px-4`}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                      )}
                    </TableHead>
                  )
                })}
                <TableHead key="url" aria-label="Detail Page Link" className="hidden p-0 md:table-cell"></TableHead>
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
                    <TableCell key={cell.id} className={`${getColumnClassName(cell.column.id)} px-2 py-3 md:p-4`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      {cell.column.id === "id" && (
                        <Link className="row-link md:hidden" href={`/message/${row.getValue("id")}`} aria-label={`Open ${row.getValue("id")}`} />
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="hidden p-0 md:table-cell"><Link className="row-link" href={`/message/${row.getValue("id")}`}></Link></TableCell>
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
