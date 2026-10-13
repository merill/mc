"use client"

import Link from "next/link"
import { ColumnDef, SortDirection } from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Cloud,
  Inbox,
  MessageSquare,
  Milestone,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"

import { siteConfig } from "@/config/site"
import { getDisplayId } from "@/lib/message-format"
import { useZapCount } from "@/lib/use-zap-counts"
import { zapLinks } from "@/lib/zap"
import { SeenOnlyInBadge } from "@/components/seen-only-in-badge"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type MessageViewSource = "messageCenter" | "roadmap" | "azure"

/** Each source's icon and its name where space is short. */
export const SOURCE_DISPLAY = {
  messageCenter: { Icon: Inbox, short: "Message Center" },
  roadmap: { Icon: Milestone, short: "Roadmap" },
  azure: { Icon: Cloud, short: "Azure" },
} as const

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
  // Kind of tenant (such as "edu") that alone returned the post, if any.
  seenOnlyIn?: string
  source: MessageViewSource
  sourceLabel: string
  // Present only for search results: a Pagefind excerpt with <mark> around
  // the matched terms.
  excerpt?: string
}

export function messageHref(id: string): string {
  return `/message/${id}`
}

// Zero-pads the numeric part of an id so MC713893 sorts below MC1000182.
// scripts/build-search-index.mjs emits the same key for Pagefind, so sorting
// by ID means the same thing whether the table is browsing or searching.
export function idSortKey(id: string): string {
  const match = /^([A-Za-z]*)(\d+)$/.exec(id ?? "")

  return match ? `${match[1]}${match[2].padStart(10, "0")}` : id ?? ""
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`

/**
 * A post's likes, dislikes and comments from zap.ms, linking to its
 * discussion. Renders nothing for a post nobody has reacted to.
 */
function RowDiscussion({ id }: { id: string }) {
  const counts = useZapCount(id)
  if (!counts) return null

  const parts = [
    { Icon: ThumbsUp, count: counts.up, word: "like" },
    { Icon: ThumbsDown, count: counts.down, word: "dislike" },
    { Icon: MessageSquare, count: counts.commentCount, word: "comment" },
  ].filter((part) => part.count > 0)

  return (
    // A plain link: next/link can fall back to a full page load that drops
    // the #discussion it was given.
    <a
      href={zapLinks(siteConfig.zap.url, id).local}
      className="mt-1 inline-flex items-center gap-x-3 rounded text-xs tabular-nums text-muted-foreground hover:text-foreground"
      aria-label={`${parts
        .map((part) => plural(part.count, part.word))
        .join(", ")}. Read the discussion`}
    >
      {parts.map(({ Icon, count, word }) => (
        <span key={word} className="inline-flex items-center gap-1">
          <Icon className="size-3.5" aria-hidden="true" /> {count}
        </span>
      ))}
    </a>
  )
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
      const SourceIcon = SOURCE_DISPLAY[row.original.source].Icon

      return (
        // The Expired badge wraps below the ID when the column is narrow
        // instead of spilling into the title column.
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* h-7 matches the title's leading-7 so the ID lines up with the
              first line of the title. */}
          <span className="inline-flex h-7 items-center gap-2 whitespace-nowrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex text-muted-foreground">
                    <SourceIcon
                      size={16}
                      aria-label={row.original.sourceLabel}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{row.original.sourceLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Link
              href={messageHref(row.original.id)}
              className="font-medium text-foreground/85 hover:underline"
            >
              {getDisplayId(row.original.id)}
            </Link>
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
          </span>
          {row.original.isArchived && (
            <Badge
              variant="outline"
              className="text-nowrap text-xs text-muted-foreground"
            >
              Expired
            </Badge>
          )}
          <SeenOnlyInBadge
            value={row.original.seenOnlyIn}
            compact
            className="text-nowrap text-muted-foreground"
          />
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
          <Link
            href={messageHref(row.original.id)}
            className="block whitespace-normal break-words leading-7 text-foreground/90 hover:underline"
          >
            {row.original.title}
          </Link>
          {row.original.excerpt && (
            <p
              className="search-excerpt mt-1 whitespace-normal break-words text-sm leading-6 text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: row.original.excerpt }}
            />
          )}
          <RowDiscussion id={row.original.id} />
        </div>
      )
    },
  },
  {
    id: "source",
    accessorFn: (row) => row.sourceLabel,
    header: () => <div className="text-nowrap">Source</div>,
    cell: ({ row }) => (
      <span className="text-nowrap leading-7 text-foreground/75">
        {SOURCE_DISPLAY[row.original.source].short}
      </span>
    ),
  },
  {
    accessorKey: "service",
    header: ({ column }) => {
      return <div className="text-center">Service</div>
    },
    cell: ({ row }) => {
      return (
        <div className="space-y-0.5 text-center leading-7">
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
        <span className="text-nowrap leading-7 text-foreground/75">
          {row.original.lastUpdated}
        </span>
      )
    },
  },
]
