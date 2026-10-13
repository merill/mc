import { Message } from "@/types/message"
import { metadataChanges } from "@/lib/message-format"

/** The metadata fields that changed between two versions, old value first. */
export default function MetadataDiff(props: {
  oldMessage: Message
  newMessage: Message
}) {
  const changed = metadataChanges(props.oldMessage, props.newMessage)

  if (changed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tracked metadata fields changed between these versions.
      </p>
    )
  }

  return (
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
              <span className="italic text-muted-foreground">empty</span>
            )}
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
            {row.newValue ? (
              <span className="diff-ins">{row.newValue}</span>
            ) : (
              <span className="italic text-muted-foreground">empty</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
