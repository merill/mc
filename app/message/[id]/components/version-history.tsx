"use client"

import * as React from "react"
import { GitCompare, Lock } from "lucide-react"

import {
  historyHref,
  readHistoryRequest,
  type HistoryRequest,
  type VersionEntry,
} from "@/lib/history"
import { useZapSession } from "@/lib/use-discussion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import VersionViewer from "@/app/message/[id]/components/version-viewer"

const primaryLink =
  "inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 shadow-sm hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/40"
const rowLink =
  "font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"

/**
 * The timeline of a post's versions and the controls for looking at them.
 *
 * Every control is a real link (`?v=3`, `?from=2&to=5`), so a version can be
 * bookmarked, shared, or opened in a new tab. Pressing one here changes the
 * address without loading the page again and shows the viewer above the
 * timeline.
 */
export default function VersionHistory(props: {
  id: string
  /** Oldest first. */
  entries: VersionEntry[]
  linkableIds: string[]
}) {
  const { id, entries } = props
  const latest = entries[entries.length - 1]
  const previous = entries[entries.length - 2]
  const original = entries[0]
  const newestFirst = React.useMemo(() => [...entries].reverse(), [entries])

  const { session } = useZapSession()
  const [request, setRequest] = React.useState<HistoryRequest | null>(null)
  const [from, setFrom] = React.useState(String(previous.number))
  const [to, setTo] = React.useState(String(latest.number))
  const viewer = React.useRef<HTMLDivElement>(null)

  // Read after hydration, since the static page knows nothing of its address.
  React.useEffect(() => {
    const read = () =>
      setRequest(readHistoryRequest(window.location.search, entries))
    read()
    window.addEventListener("popstate", read)
    return () => window.removeEventListener("popstate", read)
  }, [entries])

  const open = (next: HistoryRequest | null) => {
    window.history.pushState(
      null,
      "",
      historyHref(id, next, window.location.search)
    )
    setRequest(next)
    if (next) {
      // After the viewer has been drawn, so there is something to scroll to.
      requestAnimationFrame(() =>
        viewer.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      )
    }
  }

  /** A link that opens `target` in place when pressed without a modifier. */
  const linkTo = (target: HistoryRequest) => ({
    href: historyHref(id, target),
    onClick: (event: React.MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      event.preventDefault()
      open(target)
    },
  })
  const compare = (older: number, newer: number): HistoryRequest => ({
    kind: "compare",
    from: older,
    to: newer,
  })

  return (
    <div className="space-y-4">
      {session.status === "signed-out" && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock size={14} aria-hidden="true" />
          Sign in to open a version or compare two. The list below is open to
          everyone.
        </p>
      )}

      {/* Primary CTAs: the two most common comparisons. */}
      <div className="flex flex-wrap gap-2">
        <a
          {...linkTo(compare(previous.number, latest.number))}
          className={primaryLink}
        >
          <GitCompare size={14} aria-hidden="true" />
          Compare latest to previous (v{previous.number})
        </a>
        {/* With two versions the original is the previous one. */}
        {entries.length >= 3 && (
          <a
            {...linkTo(compare(original.number, latest.number))}
            className={primaryLink}
          >
            <GitCompare size={14} aria-hidden="true" />
            Compare latest to original (v1)
          </a>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="mb-2 text-sm font-medium text-foreground">
          Compare any two versions
        </p>
        <div className="flex flex-wrap items-end gap-2">
          {(
            [
              ["From", from, setFrom],
              ["To", to, setTo],
            ] as const
          ).map(([name, value, setValue]) => (
            <div key={name} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{name}</span>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger className="min-w-[14rem]" aria-label={name}>
                  <SelectValue placeholder="Select a version" />
                </SelectTrigger>
                <SelectContent>
                  {newestFirst.map((entry) => (
                    <SelectItem key={entry.number} value={String(entry.number)}>
                      v{entry.number} · {entry.label}
                      {entry.number === latest.number ? " (latest)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <button
            type="button"
            onClick={() => open(compare(Number(from), Number(to)))}
            disabled={from === to}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GitCompare size={14} aria-hidden="true" />
            Compare
          </button>
        </div>
      </div>

      <div ref={viewer} className="scroll-mt-24">
        {request && (
          <VersionViewer
            id={id}
            entries={entries}
            request={request}
            linkableIds={props.linkableIds}
            onOpen={open}
          />
        )}
      </div>

      <ol className="relative space-y-5 border-l border-border pl-5">
        {newestFirst.map((entry) => {
          const isLatest = entry.number === latest.number
          return (
            <li key={entry.number} className="relative">
              <span
                className={
                  "absolute -left-[27px] mt-1.5 inline-block h-3 w-3 rounded-full border-2 border-background " +
                  (isLatest ? "bg-emerald-500" : "bg-muted-foreground/60")
                }
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold text-foreground">
                  {entry.label}
                </span>
                {isLatest ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
                    Latest · v{entry.number}
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {entry.number === 1 ? "Original · v1" : `v${entry.number}`}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Changed: {entry.changed.join(", ")}
              </p>
              {!isLatest && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <a
                    {...linkTo({ kind: "snapshot", version: entry.number })}
                    className={rowLink}
                  >
                    View this version
                  </a>
                  <a
                    {...linkTo(compare(entry.number, latest.number))}
                    className={`inline-flex items-center gap-1 ${rowLink}`}
                  >
                    <GitCompare size={14} aria-hidden="true" />
                    Compare to latest
                  </a>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
