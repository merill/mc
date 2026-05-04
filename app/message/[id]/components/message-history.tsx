import Link from "next/link"
import { Clock, GitCompare } from "lucide-react"

import {
  getFormattedDate,
  getMessageHistory,
  slugifyCapturedAt,
  summarizeChanges,
} from "@/lib/messages"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import VersionPicker from "@/app/message/[id]/components/version-picker"

function formatDateTime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const date = getFormattedDate(iso)
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${date} · ${time}`
}

export default function MessageHistory(props: { id: string }) {
  const history = getMessageHistory(props.id)
  if (!history || history.versions.length < 2) return null

  // Versions are stored chronologically asc; for the timeline we display
  // newest at the top.
  const reversed = [...history.versions].reverse()
  const latest = reversed[0]
  const latestSlug = slugifyCapturedAt(latest.capturedAt)
  const totalVersions = history.versions.length

  // The original (oldest) version sits at the end of the reversed array.
  const original = reversed[reversed.length - 1]
  const originalSlug = slugifyCapturedAt(original.capturedAt)
  // The version immediately before the latest one.
  const previous = reversed[1]
  const previousSlug = previous ? slugifyCapturedAt(previous.capturedAt) : null

  // Pre-compute "what changed since the previous version" for each entry.
  const summaries = reversed.map((v, i) => {
    // The "previous" version (older) is the next one in the reversed array.
    const prev = reversed[i + 1]?.message
    return summarizeChanges(prev, v.message)
  })

  // Only show "Compare to original" when the original isn't already the
  // immediate predecessor (i.e., when there are 3+ versions).
  const showCompareToOriginal = totalVersions >= 3

  return (
    <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Clock size={18} />
          Version history
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalVersions} versions tracked
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Updated {totalVersions - 1}{" "}
          {totalVersions - 1 === 1 ? "time" : "times"} since{" "}
          <span className="font-medium text-foreground">
            {getFormattedDate(original.capturedAt)}
          </span>
          . Microsoft Message Center only ever shows the current version; this
          archive preserves the history.
        </p>

        {/* Primary CTAs: the two most common comparisons. */}
        <div className="flex flex-wrap gap-2">
          {previousSlug && (
            <Link
              href={`/message/${props.id}/compare/${previousSlug}/${latestSlug}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 shadow-sm hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              <GitCompare size={14} />
              Compare latest to previous (v{totalVersions - 1})
            </Link>
          )}
          {showCompareToOriginal && (
            <Link
              href={`/message/${props.id}/compare/${originalSlug}/${latestSlug}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 shadow-sm hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/40"
            >
              <GitCompare size={14} />
              Compare latest to original (v1)
            </Link>
          )}
        </div>

        <VersionPicker
          id={props.id}
          versions={reversed.map((v) => ({
            slug: slugifyCapturedAt(v.capturedAt),
            label: formatDateTime(v.capturedAt),
            isLatest: v.capturedAt === latest.capturedAt,
          }))}
          latestSlug={latestSlug}
        />

        <ol className="relative space-y-5 border-l border-border pl-5">
          {reversed.map((v, i) => {
            const slug = slugifyCapturedAt(v.capturedAt)
            const isLatest = i === 0
            const versionNumber = totalVersions - i
            return (
              <li key={slug} className="relative">
                <span
                  className={
                    "absolute -left-[27px] mt-1.5 inline-block h-3 w-3 rounded-full border-2 border-background " +
                    (isLatest ? "bg-emerald-500" : "bg-muted-foreground/60")
                  }
                  aria-hidden
                />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold text-foreground">
                    {formatDateTime(v.capturedAt)}
                  </span>
                  {isLatest ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
                      Latest · v{versionNumber}
                    </span>
                  ) : versionNumber === 1 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Original · v1
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      v{versionNumber}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Changed: {summaries[i].join(", ")}
                </p>
                {!isLatest && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <Link
                      href={`/message/${props.id}/v/${slug}`}
                      className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      View this version
                    </Link>
                    <Link
                      href={`/message/${props.id}/compare/${slug}/${latestSlug}`}
                      className="inline-flex items-center gap-1 font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      <GitCompare size={14} />
                      Compare to latest
                    </Link>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
