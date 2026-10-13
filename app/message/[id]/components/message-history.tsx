import { Clock } from "lucide-react"

import { slugifyCapturedAt, type VersionEntry } from "@/lib/history"
import {
  getFormattedDate,
  getMessageHistory,
  getMessageReferences,
  summarizeChanges,
} from "@/lib/messages"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import VersionHistory from "@/app/message/[id]/components/version-history"

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

/**
 * The version history card on a post's page. Only the list of versions is
 * built into the page; what each version said is fetched for signed-in
 * visitors (see `version-viewer.tsx`).
 */
export default function MessageHistory(props: { id: string }) {
  const history = getMessageHistory(props.id)
  if (!history || history.versions.length < 2) return null

  const totalVersions = history.versions.length
  const entries: VersionEntry[] = history.versions.map((version, index) => ({
    number: index + 1,
    slug: slugifyCapturedAt(version.capturedAt),
    label: formatDateTime(version.capturedAt),
    changed: summarizeChanges(
      history.versions[index - 1]?.message,
      version.message
    ),
  }))

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
            {getFormattedDate(history.versions[0].capturedAt)}
          </span>
          . Microsoft only ever shows the current version; this archive
          preserves the history.
        </p>

        <VersionHistory
          id={props.id}
          entries={entries}
          linkableIds={getMessageReferences(props.id)}
        />
      </CardContent>
    </Card>
  )
}
