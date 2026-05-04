import Link from "next/link"
import { ArrowUpRight, CornerDownRight, Link2 } from "lucide-react"

import {
  getMessageData,
  getMessageReferencedBy,
  getMessageReferences,
  getMessageSource,
  truncateText,
  stripHtml,
} from "@/lib/messages"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSource } from "@/types/message"

const MAX_LIST = 25

function RelatedRow(props: { id: string; currentId: string }) {
  const target = getMessageData(props.id)
  const title = target?.Title ?? "(unknown post)"
  const source = getMessageSource(target)
  const sourceLabel =
    source === MessageSource.Roadmap ? "Roadmap" : "Message Center"
  const summary = truncateText(stripHtml(target?.Body?.Content) || "", 160)

  return (
    <li>
      <Link
        href={`/message/${props.id}`}
        className="group flex flex-col gap-0.5 rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-muted/40"
      >
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-sm text-blue-700 group-hover:underline dark:text-blue-300">
            {props.id}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {sourceLabel}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {summary}
          </p>
        )}
      </Link>
    </li>
  )
}

export default function RelatedMessages(props: { id: string }) {
  const refs = getMessageReferences(props.id)
  const incoming = getMessageReferencedBy(props.id)
  if (refs.length === 0 && incoming.length === 0) return null

  const refsCapped = refs.slice(0, MAX_LIST)
  const incomingCapped = incoming.slice(0, MAX_LIST)

  return (
    <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 size={18} />
          Related posts
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        {refsCapped.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <ArrowUpRight size={14} />
              References ({refs.length})
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Other posts mentioned in this post.
            </p>
            <ul className="space-y-1">
              {refsCapped.map((id) => (
                <RelatedRow key={id} id={id} currentId={props.id} />
              ))}
            </ul>
            {refs.length > MAX_LIST && (
              <p className="mt-2 text-xs text-muted-foreground">
                +{refs.length - MAX_LIST} more not shown
              </p>
            )}
          </section>
        )}
        {incomingCapped.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <CornerDownRight size={14} />
              Referenced by ({incoming.length})
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">
              Posts that mention this one.
            </p>
            <ul className="space-y-1">
              {incomingCapped.map((id) => (
                <RelatedRow key={id} id={id} currentId={props.id} />
              ))}
            </ul>
            {incoming.length > MAX_LIST && (
              <p className="mt-2 text-xs text-muted-foreground">
                +{incoming.length - MAX_LIST} more not shown
              </p>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  )
}
