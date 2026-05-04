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

  // Pre-compute "what changed since the previous version" for each entry.
  const summaries = reversed.map((v, i) => {
    // The "previous" version (older) is the next one in the reversed array.
    const prev = reversed[i + 1]?.message
    return summarizeChanges(prev, v.message)
  })

  return (
    <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Clock size={18} />
          Version history
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {history.versions.length} versions tracked
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This post has been updated over time. Browse prior versions or
          compare any two below. Microsoft Message Center only ever shows the
          current version; this archive preserves the history.
        </p>

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
            const prev = reversed[i + 1]
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
                      Latest
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      v{history.versions.length - i}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Changed: {summaries[i].join(", ")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  {!isLatest && (
                    <Link
                      href={`/message/${props.id}/v/${slug}`}
                      className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      View this version
                    </Link>
                  )}
                  {!isLatest && (
                    <Link
                      href={`/message/${props.id}/compare/${slug}/${latestSlug}`}
                      className="inline-flex items-center gap-1 font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      <GitCompare size={14} />
                      Compare to latest
                    </Link>
                  )}
                  {!isLatest && prev && (
                    <Link
                      href={`/message/${props.id}/compare/${slugifyCapturedAt(
                        prev.capturedAt
                      )}/${slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-foreground/80 underline underline-offset-4 hover:text-foreground"
                    >
                      <GitCompare size={14} />
                      Compare to previous
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
