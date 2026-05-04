import { MessageSource } from "@/types/message"
import {
  getMessageData,
  getMessageSource,
  getMessageSummary,
  linkifyMcIds,
} from "@/lib/messages"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import InfoCards, {
  ExpiredBanner,
} from "@/app/message/[id]/components/info-cards"
import MessageContent from "@/app/message/[id]/components/message-content"
import MessageHistory from "@/app/message/[id]/components/message-history"
import RelatedMessages from "@/app/message/[id]/components/related-messages"

export default function MessageDetail(props: { id: string }) {
  const msg = getMessageData(props.id)
  const summary = getMessageSummary(msg)
  const contentTitle =
    getMessageSource(msg) === MessageSource.Roadmap
      ? "Description"
      : "More information"
  const linkedBody = linkifyMcIds(msg?.Body?.Content || "", props.id)
  // Summary is plain text; escape HTML special chars before running it through
  // the HTML-aware linkifier so any `&`, `<`, `>` render correctly.
  const escapedSummary = summary
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  const linkedSummary = linkifyMcIds(escapedSummary, props.id)
  return (
    <div className="flex w-full max-w-none flex-col items-start gap-6 pt-5">
      <ExpiredBanner id={props.id} />

      {summary && (
        <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-slate-50 shadow-sm dark:bg-slate-900 md:shadow-sm">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="text-lg leading-7 text-foreground/90"
              dangerouslySetInnerHTML={{ __html: linkedSummary }}
            />
          </CardContent>
        </Card>
      )}

      <InfoCards id={props.id} layout="grid" showHistoryLink />

      <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm">
        <CardHeader>
          <CardTitle>{contentTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageContent html={linkedBody} />
        </CardContent>
      </Card>

      <RelatedMessages id={props.id} />
      <section id="version-history" className="w-full scroll-mt-24">
        <MessageHistory id={props.id} />
      </section>
    </div>
  )
}
