import htmldiff from "node-htmldiff"

import { linkifyMcIds } from "@/lib/messages"
import MessageContent from "@/app/message/[id]/components/message-content"

/**
 * Renders an inline HTML diff of two message bodies. Additions appear in
 * green, deletions in red strikethrough. Embedded images keep the
 * click-to-zoom behavior provided by MessageContent.
 *
 * The diff is computed at build time on the server and shipped as static
 * HTML; only the lightbox interactivity is client-side.
 */
export default function BodyDiff(props: {
  oldHtml: string
  newHtml: string
  currentId?: string
}) {
  const diffed = htmldiff(props.oldHtml || "", props.newHtml || "")
  const linked = linkifyMcIds(diffed, props.currentId)
  return <MessageContent html={linked} />
}
