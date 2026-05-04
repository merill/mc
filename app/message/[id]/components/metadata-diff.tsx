import { Message } from "@/types/message"
import { getFormattedDate } from "@/lib/messages"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FieldRow {
  label: string
  oldValue: string
  newValue: string
}

function getDetail(msg: Message | undefined, name: string): string {
  return msg?.Details?.find((d) => d.Name === name)?.Value?.toString() ?? ""
}

function arrToStr(arr: string[] | undefined): string {
  return [...(arr ?? [])].sort().join(", ")
}

export default function MetadataDiff(props: {
  oldMessage: Message
  newMessage: Message
}) {
  const { oldMessage: a, newMessage: b } = props

  const rows: FieldRow[] = [
    { label: "Title", oldValue: a.Title ?? "", newValue: b.Title ?? "" },
    {
      label: "Services",
      oldValue: arrToStr(a.Services),
      newValue: arrToStr(b.Services),
    },
    {
      label: "Tags",
      oldValue: arrToStr(a.Tags),
      newValue: arrToStr(b.Tags),
    },
    {
      label: "Category",
      oldValue: a.Category ?? "",
      newValue: b.Category ?? "",
    },
    {
      label: "Severity",
      oldValue: a.Severity ?? "",
      newValue: b.Severity ?? "",
    },
    {
      label: "Major change",
      oldValue: a.IsMajorChange ? "Yes" : "No",
      newValue: b.IsMajorChange ? "Yes" : "No",
    },
    {
      label: "Action required by",
      oldValue: getFormattedDate(a.ActionRequiredByDateTime),
      newValue: getFormattedDate(b.ActionRequiredByDateTime),
    },
    {
      label: "End date",
      oldValue: getFormattedDate(a.EndDateTime),
      newValue: getFormattedDate(b.EndDateTime),
    },
    {
      label: "Status",
      oldValue: getDetail(a, "Status"),
      newValue: getDetail(b, "Status"),
    },
    {
      label: "Release phase",
      oldValue: getDetail(a, "ReleasePhase"),
      newValue: getDetail(b, "ReleasePhase"),
    },
    {
      label: "Platforms",
      oldValue: getDetail(a, "Platforms"),
      newValue: getDetail(b, "Platforms"),
    },
    {
      label: "Cloud instances",
      oldValue: getDetail(a, "CloudInstances"),
      newValue: getDetail(b, "CloudInstances"),
    },
  ]

  const changed = rows.filter((r) => r.oldValue !== r.newValue)

  if (changed.length === 0) {
    return (
      <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm">
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tracked metadata fields changed between these versions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm">
      <CardHeader>
        <CardTitle>Metadata changes</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border">
          {changed.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr]"
            >
              <dt className="text-sm font-medium text-foreground/80">
                {row.label}
              </dt>
              <dd className="flex flex-wrap items-baseline gap-2 text-sm">
                {row.oldValue ? (
                  <span className="diff-del">{row.oldValue}</span>
                ) : (
                  <span className="text-muted-foreground italic">empty</span>
                )}
                <span aria-hidden className="text-muted-foreground">
                  →
                </span>
                {row.newValue ? (
                  <span className="diff-ins">{row.newValue}</span>
                ) : (
                  <span className="text-muted-foreground italic">empty</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
