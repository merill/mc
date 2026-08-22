"use client"

import { ColumnDef, SortDirection } from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Inbox,
  Milestone,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type MessageView = {
  id: string
  title: string
  service: string[] | undefined
  // Display string ("Aug 21, 2026"). `date` carries the ISO form because
  // sorting the display string would order it alphabetically.
  lastUpdated: string | undefined
  date: string | undefined
  isMajor: boolean
  isArchived: boolean
  source: "messageCenter" | "roadmap"
  sourceLabel: string
  // Present only for search results: a Pagefind excerpt with <mark> around
  // the matched terms.
  excerpt?: string
}

// Zero-pads the numeric part of an id so MC713893 sorts below MC1000182.
// scripts/build-search-index.mjs emits the same key for Pagefind, so sorting
// by ID means the same thing whether the table is browsing or searching.
export function idSortKey(id: string): string {
  const match = /^([A-Za-z]*)(\d+)$/.exec(id ?? "")

  return match ? `${match[1]}${match[2].padStart(10, "0")}` : id ?? ""
}

function SortIcon({ direction }: { direction: SortDirection | false }) {
  const Icon =
    direction === "asc"
      ? ArrowUp
      : direction === "desc"
      ? ArrowDown
      : ChevronsUpDown

  return (
    <Icon
      size={14}
      className={direction ? "text-foreground" : "text-muted-foreground/50"}
      aria-hidden="true"
    />
  )
}

function SortableHeader({
  column,
  label,
  className,
}: {
  column: {
    getIsSorted: () => SortDirection | false
    toggleSorting: (desc?: boolean) => void
  }
  label: string
  className?: string
}) {
  const sorted = column.getIsSorted()

  return (
    <button
      type="button"
      // Dates read newest-first and text reads A-Z, so an unsorted column
      // starts in whichever direction people expect from that kind of value.
      onClick={() =>
        column.toggleSorting(
          sorted ? sorted === "asc" : label === "Last updated"
        )
      }
      className={`-mx-2 inline-flex items-center gap-1.5 rounded-sm px-2 py-1 hover:text-foreground ${
        className ?? ""
      }`}
      aria-label={`Sort by ${label}`}
    >
      <span className="text-nowrap">{label}</span>
      <SortIcon direction={sorted} />
    </button>
  )
}

export const columns: ColumnDef<MessageView>[] = [
  {
    accessorKey: "id",
    sortingFn: (a, b) =>
      idSortKey(a.original.id).localeCompare(idSortKey(b.original.id)),
    header: ({ column }) => <SortableHeader column={column} label="ID" />,
    cell: ({ row }) => {
      const SourceIcon = row.original.source === "roadmap" ? Milestone : Inbox

      return (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex text-muted-foreground">
                  <SourceIcon size={16} aria-label={row.original.sourceLabel} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{row.original.sourceLabel}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-nowrap font-medium text-foreground/85">
            {row.original.id}
          </span>
          {row.original.isArchived && (
            <Badge
              variant="outline"
              className="text-nowrap text-xs text-muted-foreground"
            >
              Expired
            </Badge>
          )}
          {row.original.isMajor && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex h-2 w-2 rounded-full bg-red-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Major change</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column} label="Title" />,
    cell: ({ row }) => {
      return (
        <div className="w-full min-w-0">
          <div className="whitespace-normal break-words leading-7 text-foreground/90">
            {row.original.title}
          </div>
          {row.original.excerpt && (
            <p
              className="search-excerpt mt-1 whitespace-normal break-words text-sm leading-6 text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: row.original.excerpt }}
            />
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "service",
    header: ({ column }) => {
      return <div className="text-center">Service</div>
    },
    cell: ({ row }) => {
      return (
        <div className="space-y-0.5 text-center">
          {row.original.service?.map((service) => (
            <Badge key={service} variant="secondary" className="text-nowrap">
              {service}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    id: "lastUpdated",
    accessorFn: (row) => row.date ?? "",
    header: ({ column }) => (
      <SortableHeader column={column} label="Last updated" />
    ),
    cell: ({ row }) => {
      return (
        <span className="text-nowrap text-foreground/75">
          {row.original.lastUpdated}
        </span>
      )
    },
  },
]
