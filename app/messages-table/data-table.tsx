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
import { Check, ChevronDown, Inbox, Milestone, X } from "lucide-react"

type SourceFilter = "all" | "messageCenter" | "roadmap"

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
  const [selectedServices, setSelectedServices] = React.useState<string[]>([])
  const [serviceSearch, setServiceSearch] = React.useState("")
  const [isServiceFilterOpen, setIsServiceFilterOpen] = React.useState(false)
  const serviceFilterRef = React.useRef<HTMLDivElement>(null)
  const services = React.useMemo(() => {
    const values = new Set<string>()

    data.forEach((item) => {
      ;((item as { service?: string[] }).service || []).forEach((service) => {
        values.add(service)
      })
    })

    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [data])
  const filteredServices = React.useMemo(() => {
    const search = serviceSearch.trim().toLowerCase()

    if (!search) return services

    return services.filter((service) => service.toLowerCase().includes(search))
  }, [serviceSearch, services])
  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      const sourceMatches = sourceFilter === "all" || (item as { source?: string }).source === sourceFilter
      const itemServices = (item as { service?: string[] }).service || []
      const serviceMatches = selectedServices.length === 0 || selectedServices.some((service) => itemServices.includes(service))

      return sourceMatches && serviceMatches
    })
  }, [data, selectedServices, sourceFilter])

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!serviceFilterRef.current?.contains(event.target as Node)) {
        setIsServiceFilterOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service].sort((a, b) => a.localeCompare(b))
    )
  }

  const selectedServiceLabel = selectedServices.length === 0
    ? "All services"
    : selectedServices.length === 1
      ? selectedServices[0]
      : `${selectedServices.length} services`

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
            className="gap-2"
            onClick={() => setSourceFilter("all")}
          >
            All
          </Button>
          <Button
            type="button"
            variant={sourceFilter === "messageCenter" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setSourceFilter("messageCenter")}
          >
            <Inbox size={15} />
            Message Center
          </Button>
          <Button
            type="button"
            variant={sourceFilter === "roadmap" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setSourceFilter("roadmap")}
          >
            <Milestone size={15} />
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
          <div ref={serviceFilterRef} className="relative">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between gap-2 px-3"
              onClick={() => setIsServiceFilterOpen((value) => !value)}
              aria-expanded={isServiceFilterOpen}
            >
              <span className="truncate text-left">{selectedServiceLabel}</span>
              <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
            </Button>
            {isServiceFilterOpen && (
              <div className="absolute right-0 z-50 mt-2 w-full min-w-[20rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                <div className="border-b p-2">
                  <Input
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(event) => setServiceSearch(event.target.value)}
                    className="h-9"
                  />
                </div>
                {selectedServices.length > 0 && (
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-xs text-muted-foreground">{selectedServices.length} selected</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedServices([])}
                    >
                      <X size={13} />
                      Clear
                    </button>
                  </div>
                )}
                <div className="max-h-72 overflow-y-auto p-1">
                  {filteredServices.length ? (
                    filteredServices.map((service) => {
                      const isSelected = selectedServices.includes(service)

                      return (
                        <button
                          key={service}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => toggleService(service)}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? "bg-primary text-primary-foreground" : "bg-background"}`}>
                            {isSelected && <Check size={12} />}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{service}</span>
                        </button>
                      )
                    })
                  ) : (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No services found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
