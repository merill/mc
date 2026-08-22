"use client"

import "./table.css"
import React from "react"
import Link from "next/link"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Check,
  ChevronDown,
  Inbox,
  Loader2,
  Milestone,
  Search,
  X,
} from "lucide-react"

import type { MessageArchive } from "@/types/message"
import {
  loadSearchHits,
  searchMessages,
  type PagefindResult,
  type SearchHit,
  type SearchSortKey,
} from "@/lib/search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { MessageView } from "@/app/messages-table/columns"

type SourceFilter = "all" | "messageCenter" | "roadmap"

// Browsing shows newest first. Without this the expired posts, which arrive
// after the first render, would simply pile up underneath everything else.
const defaultBrowseSorting: SortingState = [{ id: "lastUpdated", desc: true }]
const searchSortKeys: Record<string, SearchSortKey> = {
  id: "id",
  title: "title",
  lastUpdated: "date",
}

const rowBatchSize = 200
const searchBatchSize = 25
const searchDebounceMs = 250

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  archiveUrl?: string
  services: string[]
}

function toArchivedMessageView(item: MessageArchive): MessageView {
  const date = item.LastModifiedDateTime
    ? new Date(item.LastModifiedDateTime)
    : null

  return {
    id: item.Id,
    title: item.Title,
    service: item.Services,
    lastUpdated: date
      ? `${date.toLocaleString("default", {
          month: "short",
        })} ${date.getDate()}, ${date.getFullYear()}`
      : undefined,
    date: date ? date.toISOString().slice(0, 10) : undefined,
    isMajor: item.IsMajorChange ?? false,
    isArchived: true,
    source: "messageCenter",
    sourceLabel: "Message Center",
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  archiveUrl,
  services,
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

  const [allData, setAllData] = React.useState<TData[]>(data)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>("all")
  const [selectedServices, setSelectedServices] = React.useState<string[]>([])
  const [serviceSearch, setServiceSearch] = React.useState("")
  const [isServiceFilterOpen, setIsServiceFilterOpen] = React.useState(false)
  const [visibleRowCount, setVisibleRowCount] = React.useState(rowBatchSize)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [searchHits, setSearchHits] = React.useState<SearchHit[]>([])
  const [searchTotal, setSearchTotal] = React.useState(0)
  const [isSearchLoading, setIsSearchLoading] = React.useState(false)
  // Set when the Pagefind index cannot be loaded (e.g. `next dev` without a
  // prior index build). Search then degrades to a substring match.
  const [isSearchUnavailable, setIsSearchUnavailable] = React.useState(false)
  const serviceFilterRef = React.useRef<HTMLDivElement>(null)
  const loadMoreRef = React.useRef<HTMLDivElement>(null)
  const searchResultsRef = React.useRef<PagefindResult[]>([])
  const searchRequestRef = React.useRef(0)
  const isLoadingMoreRef = React.useRef(false)
  const filteredServices = React.useMemo(() => {
    const search = serviceSearch.trim().toLowerCase()

    if (!search) return services

    return services.filter((service) => service.toLowerCase().includes(search))
  }, [serviceSearch, services])
  const filteredData = React.useMemo(() => {
    return allData.filter((item) => {
      const sourceMatches =
        sourceFilter === "all" ||
        (item as { source?: string }).source === sourceFilter
      const itemServices = (item as { service?: string[] }).service || []
      const serviceMatches =
        selectedServices.length === 0 ||
        selectedServices.some((service) => itemServices.includes(service))

      return sourceMatches && serviceMatches
    })
  }, [allData, selectedServices, sourceFilter])
  const isSearchActive = query.trim().length > 0
  // An empty `sorting` means "the default for this mode": relevance while
  // searching, newest-first while browsing.
  const effectiveSorting = React.useMemo(
    () =>
      sorting.length ? sorting : isSearchActive ? [] : defaultBrowseSorting,
    [isSearchActive, sorting]
  )
  const searchSort = React.useMemo(() => {
    const column = sorting[0]
    const key = column && searchSortKeys[column.id]

    return key ? { key, descending: column.desc } : undefined
  }, [sorting])
  const fallbackResults = React.useMemo(() => {
    if (!isSearchActive || !isSearchUnavailable) return []

    const needle = query.trim().toLowerCase()

    return filteredData.filter((item) => {
      const row = item as { id?: string; title?: string }

      return (
        row.id?.toLowerCase().includes(needle) ||
        row.title?.toLowerCase().includes(needle)
      )
    })
  }, [filteredData, isSearchActive, isSearchUnavailable, query])

  React.useEffect(() => {
    setAllData(data)
  }, [data])

  React.useEffect(() => {
    if (!archiveUrl) return

    let isMounted = true

    fetch(archiveUrl)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((items: MessageArchive[]) => {
        if (!isMounted) return

        const archiveRows = items.map(toArchivedMessageView) as TData[]

        setAllData((current) => {
          const existingIds = new Set(
            current.map((item) => (item as { id?: string }).id)
          )
          const newRows = archiveRows.filter(
            (item) => !existingIds.has((item as { id?: string }).id)
          )

          return [...current, ...newRows]
        })
      })
      .catch(() => {
        // Archive rows are optional; active messages and roadmap still render if fetch fails.
      })

    return () => {
      isMounted = false
    }
  }, [archiveUrl])

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!serviceFilterRef.current?.contains(event.target as Node)) {
        setIsServiceFilterOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  // Debounce keystrokes so a query only reaches Pagefind once typing pauses.
  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(searchTerm), searchDebounceMs)

    return () => clearTimeout(timer)
  }, [searchTerm])

  React.useEffect(() => {
    const trimmed = query.trim()
    const request = ++searchRequestRef.current

    if (!trimmed) {
      searchResultsRef.current = []
      setSearchHits([])
      setSearchTotal(0)
      setIsSearchLoading(false)
      return
    }

    setIsSearchLoading(true)

    searchMessages(trimmed, {
      source: sourceFilter,
      services: selectedServices,
      sort: searchSort,
    })
      .then(async (results) => {
        if (request !== searchRequestRef.current) return

        searchResultsRef.current = results
        const hits = await loadSearchHits(results, 0, searchBatchSize)

        if (request !== searchRequestRef.current) return

        setIsSearchUnavailable(false)
        setSearchTotal(results.length)
        setSearchHits(hits)
        setIsSearchLoading(false)
      })
      .catch((error) => {
        if (request !== searchRequestRef.current) return

        console.error(
          "Search index unavailable, falling back to title match",
          error
        )
        searchResultsRef.current = []
        setSearchHits([])
        setSearchTotal(0)
        setIsSearchUnavailable(true)
        setIsSearchLoading(false)
      })
  }, [query, searchSort, selectedServices, sourceFilter])

  const toggleService = (service: string) => {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service].sort((a, b) => a.localeCompare(b))
    )
  }

  const selectedServiceLabel =
    selectedServices.length === 0
      ? "All services"
      : selectedServices.length === 1
      ? selectedServices[0]
      : `${selectedServices.length} services`

  const tableData = React.useMemo(() => {
    if (!isSearchActive) return filteredData
    if (isSearchUnavailable) return fallbackResults

    return searchHits as unknown as TData[]
  }, [
    fallbackResults,
    filteredData,
    isSearchActive,
    isSearchUnavailable,
    searchHits,
  ])

  const usesPagefind = isSearchActive && !isSearchUnavailable
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    // While searching, Pagefind has already ordered the full match set —
    // re-sorting here would only reorder the rows fetched so far.
    manualSorting: usesPagefind,
    state: {
      sorting: effectiveSorting,
    },
  })
  const rows = table.getRowModel().rows
  const visibleRows = usesPagefind ? rows : rows.slice(0, visibleRowCount)
  const hasMoreRows = usesPagefind
    ? searchHits.length < searchTotal
    : visibleRowCount < rows.length
  const totalRowCount = usesPagefind ? searchTotal : rows.length

  const loadMoreRows = React.useCallback(async () => {
    if (!usesPagefind) {
      setVisibleRowCount((current) =>
        Math.min(current + rowBatchSize, rows.length)
      )
      return
    }

    if (isLoadingMoreRef.current) return

    isLoadingMoreRef.current = true
    const request = searchRequestRef.current

    try {
      const nextHits = await loadSearchHits(
        searchResultsRef.current,
        searchHits.length,
        searchBatchSize
      )

      if (request !== searchRequestRef.current) return

      setSearchHits((current) => [...current, ...nextHits])
    } catch (error) {
      console.error("Unable to load more search results", error)
    } finally {
      isLoadingMoreRef.current = false
    }
  }, [rows.length, searchHits.length, usesPagefind])

  React.useEffect(() => {
    setVisibleRowCount(rowBatchSize)
  }, [rows.length, selectedServices, sourceFilter])

  React.useEffect(() => {
    if (!hasMoreRows) return

    const loadMoreNode = loadMoreRef.current
    if (!loadMoreNode) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void loadMoreRows()
        }
      },
      { rootMargin: "800px 0px" }
    )

    observer.observe(loadMoreNode)

    return () => observer.disconnect()
  }, [hasMoreRows, loadMoreRows])

  const resultSummary = () => {
    if (isSearchActive && isSearchLoading && !visibleRows.length) {
      return "Searching…"
    }

    if (!visibleRows.length) return ""

    return hasMoreRows
      ? `Showing ${visibleRows.length} of ${totalRowCount} results`
      : `Showing all ${totalRowCount} results`
  }

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
        <div className="grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_minmax(12rem,18rem)] lg:flex lg:flex-1 lg:items-center">
          <div className="relative w-full lg:flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search ID, title, or message text..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9 pr-9"
              aria-label="Search messages"
            />
            {isSearchActive && isSearchLoading ? (
              <Loader2
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={16} />
                </button>
              )
            )}
          </div>
          <div ref={serviceFilterRef} className="relative w-full sm:w-72">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-between gap-2 px-3"
              onClick={() => setIsServiceFilterOpen((value) => !value)}
              aria-expanded={isServiceFilterOpen}
            >
              <span className="truncate text-left">{selectedServiceLabel}</span>
              <ChevronDown
                size={16}
                className="shrink-0 text-muted-foreground"
              />
            </Button>
            {isServiceFilterOpen && (
              <div className="absolute right-0 z-50 mt-2 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md sm:w-80">
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
                    <span className="text-xs text-muted-foreground">
                      {selectedServices.length} selected
                    </span>
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
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-background"
                            }`}
                          >
                            {isSelected && <Check size={12} />}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {service}
                          </span>
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
      {isSearchActive && isSearchUnavailable && (
        <div className="mb-3 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Full-text search is unavailable right now, so results are limited to
          ID and title matches.
        </div>
      )}
      <div className="rounded-md border text-[15px] leading-6">
        <Table className="table-fixed md:table-auto">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={`${getColumnClassName(
                        header.column.id
                      )} px-2 text-sm font-semibold text-foreground/75 md:px-4`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
                <TableHead
                  key="url"
                  aria-label="Detail Page Link"
                  className="hidden p-0 md:table-cell"
                ></TableHead>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`${getColumnClassName(
                        cell.column.id
                      )} px-2 py-3 align-top md:p-4`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                      {cell.column.id === "id" && (
                        <Link
                          className="row-link md:hidden"
                          href={`/message/${row.getValue("id")}`}
                          aria-label={`Open ${row.getValue("id")}`}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="hidden p-0 md:table-cell">
                    <Link
                      className="row-link"
                      href={`/message/${row.getValue("id")}`}
                    ></Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {isSearchActive && isSearchLoading
                    ? "Searching…"
                    : isSearchActive
                    ? "No messages match this search."
                    : "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {visibleRows.length > 0 && (
        <div
          ref={loadMoreRef}
          className="py-4 text-center text-sm text-muted-foreground"
        >
          {resultSummary()}
        </div>
      )}
    </div>
  )
}
