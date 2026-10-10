"use client"

import * as React from "react"
import { ArrowDown, ArrowRight, MessageSquare } from "lucide-react"

import { siteConfig } from "@/config/site"
import { useDiscussion } from "@/lib/use-discussion"
import { cn } from "@/lib/utils"
import {
  BADGE_LABELS,
  ZapThreadNode,
  avatarColor,
  buildThread,
  sanitizeCommentHtml,
  timeAgo,
  zapLinks,
} from "@/lib/zap"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

type Discussion = ReturnType<typeof useDiscussion>

const DRAFT_PREFIX = "zap-draft:"

const commentLabel = (count: number) =>
  `${count} comment${count === 1 ? "" : "s"}`

/**
 * Compact row under the Summary: like and dislike counts, the comment count
 * and a jump to the thread further down. Liking and disliking happen here;
 * until zap.ms answers on this site's address they are links to zap.ms.
 */
export function DiscussionSummary({ id }: { id: string }) {
  const discussion = useDiscussion(id)
  const state = discussion.thread
  const links = zapLinks(siteConfig.zap.url, id)
  const data = state.status === "ready" ? state.data : null
  const inline = discussion.session.status !== "off"
  const pill = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "h-8 gap-1.5 tabular-nums"
  )
  const reactions = [
    { dir: "up", icon: "👍", name: "Like", count: data?.up, href: links.like },
    {
      dir: "down",
      icon: "👎",
      name: "Dislike",
      count: data?.down,
      href: links.dislike,
    },
  ] as const

  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      {reactions.map((reaction) => {
        const mine = discussion.mine.reaction === reaction.dir
        const label =
          reaction.count === undefined
            ? reaction.name
            : `${reaction.name}. ${reaction.count} so far`
        const content = (
          <>
            {reaction.icon}{" "}
            <Count state={state.status} value={reaction.count} />
          </>
        )
        return inline ? (
          <button
            key={reaction.dir}
            type="button"
            className={cn(
              pill,
              mine && "border-primary bg-accent text-foreground"
            )}
            aria-pressed={mine}
            aria-label={label}
            title={
              mine
                ? `Remove your ${reaction.name.toLowerCase()}`
                : reaction.name
            }
            disabled={
              discussion.busy || discussion.session.status === "checking"
            }
            onClick={() => discussion.react(reaction.dir)}
          >
            {content}
          </button>
        ) : (
          <a
            key={reaction.dir}
            className={pill}
            href={reaction.href}
            title={`${reaction.name} on zap.ms`}
            aria-label={`${label}. Opens zap.ms`}
          >
            {content}
          </a>
        )
      })}
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
      <span className="text-xs">
        {inline ? "powered by zap.ms" : "on zap.ms"}
      </span>
      {discussion.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {discussion.error}
        </p>
      )}
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

/** The full thread, with a comment box once the visitor is signed in. */
export function DiscussionThread({ id }: { id: string }) {
  const discussion = useDiscussion(id)
  const state = discussion.thread
  const { session } = discussion
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
        {session.status === "off" && (
          <a className={cn(buttonVariants(), "gap-1.5")} href={links.comment}>
            Write a comment on zap.ms
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        )}
        {session.status === "signed-out" && (
          <button
            type="button"
            className={buttonVariants()}
            onClick={discussion.signIn}
          >
            Sign in to comment
          </button>
        )}
        {session.status === "signed-in" && (
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {session.username}
            </span>{" "}
            ·{" "}
            <button
              type="button"
              className="readable-link"
              onClick={discussion.signOut}
            >
              Sign out
            </button>
          </p>
        )}
      </CardHeader>

      {session.status === "signed-in" && (
        <div className="border-t p-4 sm:p-6">
          <CommentForm
            discussion={discussion}
            postId={id}
            parentId={null}
            label="Add a comment"
          />
        </div>
      )}

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
            <Comment
              key={node.comment.id}
              node={node}
              postId={id}
              discussion={discussion}
            />
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
        <span>
          {session.status === "off"
            ? "Discussion hosted on zap.ms · sign in there to reply"
            : "Discussion powered by zap.ms · you sign in with a zap.ms account"}
        </span>
        <a className="readable-link" href={links.section}>
          All Message Center discussions
        </a>
      </p>
    </Card>
  )
}

/**
 * A comment or reply box. What is typed is kept for the tab, so a draft
 * survives a reload or a sign-in that ran out part-way.
 */
function CommentForm(props: {
  discussion: Discussion
  postId: string
  parentId: number | null
  label: string
  onDone?: () => void
}) {
  const { discussion, parentId } = props
  const draftKey = `${DRAFT_PREFIX}${props.postId}:${parentId ?? "new"}`
  const [text, setText] = React.useState("")
  const fieldId = React.useId()

  React.useEffect(() => {
    try {
      setText(sessionStorage.getItem(draftKey) ?? "")
    } catch {
      // No storage: the box starts empty.
    }
  }, [draftKey])

  const update = (value: string) => {
    setText(value)
    try {
      sessionStorage.setItem(draftKey, value)
    } catch {
      // The draft is simply not kept.
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    if (await discussion.comment(text, parentId)) {
      update("")
      props.onDone?.()
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {props.label}
      </label>
      <textarea
        id={fieldId}
        value={text}
        onChange={(event) => update(event.target.value)}
        rows={parentId === null ? 4 : 3}
        maxLength={8000}
        required
        className="w-full rounded-md border bg-background px-3 py-2 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Seen this change in your tenant? Say how it went."
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className={buttonVariants({ size: "sm" })}
          disabled={discussion.busy || !text.trim()}
        >
          {parentId === null ? "Post comment" : "Post reply"}
        </button>
        {props.onDone && (
          <button
            type="button"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            onClick={props.onDone}
          >
            Cancel
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          Markdown works here.
        </span>
      </div>
      {discussion.error && (
        <p role="alert" className="text-sm text-destructive">
          {discussion.error}
        </p>
      )}
    </form>
  )
}

function Comment({
  node,
  postId,
  discussion,
}: {
  node: ZapThreadNode
  postId: string
  discussion: Discussion
}) {
  const { comment, replies } = node
  const { session } = discussion
  const [replying, setReplying] = React.useState(false)
  const upvoted = discussion.mine.commentVotes[comment.id] === "up"
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
          {session.status === "signed-in" && comment.author ? (
            <button
              type="button"
              className={cn(
                "rounded px-1 tabular-nums hover:bg-accent hover:text-foreground",
                upvoted
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
              aria-pressed={upvoted}
              aria-label={`Upvote ${name}'s comment. Score ${comment.score}`}
              disabled={discussion.busy}
              onClick={() => discussion.upvote(comment.id)}
            >
              ▲ {comment.score}
            </button>
          ) : (
            <span
              className="tabular-nums text-muted-foreground"
              title="Score on zap.ms"
            >
              ▲ {comment.score}
            </span>
          )}
          {session.status === "off" ? (
            <a
              className="ml-auto rounded px-1 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              href={links.reply(comment.id)}
              aria-label={`Reply to ${name} on zap.ms`}
            >
              reply →
            </a>
          ) : (
            <button
              type="button"
              className="ml-auto rounded px-1 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-expanded={replying}
              aria-label={`Reply to ${name}`}
              disabled={session.status === "checking"}
              onClick={() =>
                session.status === "signed-in"
                  ? setReplying((open) => !open)
                  : discussion.signIn()
              }
            >
              reply
            </button>
          )}
        </div>
        <div
          className="zap-comment"
          // zap.ms renders this to a fixed set of tags; sanitizeCommentHtml
          // rebuilds it so nothing outside that set can reach the page.
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {replying && (
          <div className="mt-3">
            <CommentForm
              discussion={discussion}
              postId={postId}
              parentId={comment.id}
              label={`Reply to ${name}`}
              onDone={() => setReplying(false)}
            />
          </div>
        )}
        {replies.length > 0 && (
          <div className="mt-4 flex flex-col gap-4 border-l-2 pl-3 sm:pl-4">
            {replies.map((reply) => (
              <Comment
                key={reply.comment.id}
                node={reply}
                postId={postId}
                discussion={discussion}
              />
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
