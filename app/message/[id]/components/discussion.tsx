"use client"

import * as React from "react"
import { ArrowDown, ArrowRight, MessageSquare } from "lucide-react"

import { siteConfig } from "@/config/site"
import { useZap } from "@/lib/use-zap"
import { cn } from "@/lib/utils"
import {
  BADGE_LABELS,
  ZapDiscussion,
  ZapThreadNode,
  avatarColor,
  buildThread,
  sanitizeCommentHtml,
  timeAgo,
  zapLinks,
} from "@/lib/zap"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

const useDiscussion = (id: string) => useZap<ZapDiscussion>(`/mc/${id}`)

const commentLabel = (count: number) =>
  `${count} comment${count === 1 ? "" : "s"}`

/**
 * Compact row under the Summary: like and dislike counts, the comment count
 * and a jump to the thread further down. Every control is a link to zap.ms.
 */
export function DiscussionSummary({ id }: { id: string }) {
  const state = useDiscussion(id)
  const links = zapLinks(siteConfig.zap.url, id)
  const data = state.status === "ready" ? state.data : null
  const pill = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "h-8 gap-1.5 tabular-nums"
  )

  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <a
        className={pill}
        href={links.like}
        title="Like on zap.ms"
        aria-label={
          data ? `${data.up} likes. Like on zap.ms` : "Like on zap.ms"
        }
      >
        👍 <Count state={state.status} value={data?.up} />
      </a>
      <a
        className={pill}
        href={links.dislike}
        title="Dislike on zap.ms"
        aria-label={
          data
            ? `${data.down} dislikes. Dislike on zap.ms`
            : "Dislike on zap.ms"
        }
      >
        👎 <Count state={state.status} value={data?.down} />
      </a>
      <a
        className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
        href="#discussion"
      >
        <MessageSquare className="size-4" aria-hidden="true" />
        {data && data.commentCount > 0
          ? commentLabel(data.commentCount)
          : "Discussion"}
        <ArrowDown className="size-3.5" aria-hidden="true" />
      </a>
      <span className="text-xs">on zap.ms</span>
    </div>
  )
}

function Count(props: { state: string; value: number | undefined }) {
  if (props.state === "loading") {
    return (
      <span
        className="inline-block h-3 w-4 animate-pulse rounded bg-muted motion-reduce:animate-none"
        aria-hidden="true"
      />
    )
  }
  // When zap.ms cannot be reached the button still works, without a number.
  return props.value === undefined ? null : <span>{props.value}</span>
}

/** The full thread, read-only. Rendered below the post body. */
export function DiscussionThread({ id }: { id: string }) {
  const state = useDiscussion(id)
  const links = zapLinks(siteConfig.zap.url, id)
  const data = state.status === "ready" ? state.data : null
  const thread = React.useMemo(
    () => (data ? buildThread(data.comments) : []),
    [data]
  )

  return (
    <Card
      id="discussion"
      aria-labelledby="discussion-title"
      className="w-full scroll-mt-24 overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm"
    >
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-3 space-y-0">
        <CardTitle id="discussion-title">
          Discussion
          {data && data.commentCount > 0 && (
            <span className="ml-2 text-base font-normal tracking-normal text-muted-foreground">
              · {commentLabel(data.commentCount)}
            </span>
          )}
        </CardTitle>
        <a className={cn(buttonVariants(), "gap-1.5")} href={links.comment}>
          Write a comment on zap.ms
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </CardHeader>

      {state.status === "loading" && <ThreadSkeleton />}

      {state.status !== "loading" && thread.length === 0 && (
        <div className="flex flex-col items-center gap-2 border-t px-6 py-8 text-center">
          <p className="text-lg font-semibold">No comments yet</p>
          <p className="max-w-prose text-sm text-muted-foreground">
            Seen this change in your tenant? Be the first to say how it went.
          </p>
        </div>
      )}

      {thread.length > 0 && (
        <div className="flex flex-col gap-5 border-t p-4 sm:p-6">
          {thread.map((node) => (
            <Comment key={node.comment.id} node={node} postId={id} />
          ))}
        </div>
      )}

      {data?.truncated && (
        <p className="flex flex-wrap justify-center gap-x-2 border-t px-6 py-4 text-sm text-muted-foreground">
          Showing the first {data.comments.length} of {data.commentCount}{" "}
          comments.
          <a className="readable-link" href={links.post}>
            View all on zap.ms
          </a>
        </p>
      )}

      <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t bg-muted/50 px-6 py-3.5 text-sm text-muted-foreground">
        <span>Discussion hosted on zap.ms · sign in there to reply</span>
        <a className="readable-link" href={links.section}>
          All Message Center discussions
        </a>
      </p>
    </Card>
  )
}

function Comment({ node, postId }: { node: ZapThreadNode; postId: string }) {
  const { comment, replies } = node
  const links = zapLinks(siteConfig.zap.url, postId)
  const name = comment.author ?? "removed"
  const html = React.useMemo(
    () => sanitizeCommentHtml(comment.html),
    [comment.html]
  )

  return (
    <article id={`comment-${comment.id}`} className="flex scroll-mt-24 gap-3">
      <span
        className="mt-0.5 flex size-7 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
        style={{ backgroundColor: avatarColor(name) }}
        aria-hidden="true"
      >
        {name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-7">
          {comment.author ? (
            <a
              className="font-semibold underline-offset-4 hover:underline"
              href={links.user(comment.author)}
            >
              {comment.author}
            </a>
          ) : (
            <span className="text-muted-foreground">removed</span>
          )}
          {comment.badges.map((badge) => (
            <span
              key={badge}
              className={cn(
                "rounded-full px-2 py-px text-xs font-semibold text-white",
                badge === "microsoft" ? "bg-[#0078d4]" : "bg-[#b31b1b]"
              )}
            >
              {BADGE_LABELS[badge] ?? badge}
            </span>
          ))}
          <a
            className="text-muted-foreground underline-offset-4 hover:underline"
            href={comment.url}
          >
            {timeAgo(comment.createdAt)}
          </a>
          <span
            className="tabular-nums text-muted-foreground"
            title="Score on zap.ms"
          >
            ▲ {comment.score}
          </span>
          <a
            className="ml-auto rounded px-1 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            href={links.reply(comment.id)}
            aria-label={`Reply to ${name} on zap.ms`}
          >
            reply →
          </a>
        </div>
        <div
          className="zap-comment"
          // zap.ms renders this to a fixed set of tags; sanitizeCommentHtml
          // rebuilds it so nothing outside that set can reach the page.
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {replies.length > 0 && (
          <div className="mt-4 flex flex-col gap-4 border-l-2 pl-3 sm:pl-4">
            {replies.map((reply) => (
              <Comment key={reply.comment.id} node={reply} postId={postId} />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function ThreadSkeleton() {
  return (
    <div
      className="flex flex-col gap-5 border-t p-4 sm:p-6"
      aria-busy="true"
      aria-label="Loading discussion"
    >
      {[72, 48].map((width) => (
        <div key={width} className="flex gap-3">
          <span className="size-7 shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <span className="h-3 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <span
              className="h-3 animate-pulse rounded bg-muted motion-reduce:animate-none"
              style={{ width: `${width}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
