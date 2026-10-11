"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowRight,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"

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
import { draftKey, readDraft, saveDraft } from "@/lib/zap-local"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

type Discussion = ReturnType<typeof useDiscussion>

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
    {
      dir: "up",
      Icon: ThumbsUp,
      name: "Like",
      count: data?.up,
      href: links.like,
    },
    {
      dir: "down",
      Icon: ThumbsDown,
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
            <reaction.Icon
              className={cn("size-4", mine && "fill-current")}
              aria-hidden="true"
            />
            <Count state={state.status} value={reaction.count} />
          </>
        )
        return inline ? (
          <button
            key={reaction.dir}
            type="button"
            className={cn(
              pill,
              mine &&
                "border-transparent bg-primary text-primary-foreground hover:bg-primary/85 hover:text-primary-foreground"
            )}
            aria-pressed={mine}
            aria-label={label}
            title={
              mine
                ? `Remove your ${reaction.name.toLowerCase()}`
                : reaction.name
            }
            disabled={discussion.session.status === "checking"}
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
        {session.status === "off" && (
          <span>Discussion hosted on zap.ms · sign in there to reply</span>
        )}
        <a className="readable-link" href={links.section}>
          All Message Center discussions
        </a>
      </p>
    </Card>
  )
}

/**
 * A comment or reply box. What is typed is saved in the browser as it is
 * typed, so it survives a reload, a closed tab or a crash, and is removed
 * once zap.ms has the comment or the visitor discards it.
 */
function CommentForm(props: {
  discussion: Discussion
  postId: string
  parentId: number | null
  label: string
  onDone?: () => void
}) {
  const { discussion, parentId } = props
  const key = draftKey(props.postId, parentId)
  const [text, setText] = React.useState("")
  const [restored, setRestored] = React.useState(false)
  const fieldId = React.useId()

  React.useEffect(() => {
    const saved = readDraft(localStorage, key, Date.now())
    setText(saved)
    setRestored(saved !== "")
  }, [key])

  const update = (value: string) => {
    setText(value)
    saveDraft(localStorage, key, value, Date.now())
  }

  const discard = () => {
    update("")
    setRestored(false)
    props.onDone?.()
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const sent = text
    if (!sent.trim()) return
    // The comment shows in the thread at once, so the box empties now. The
    // saved copy stays until zap.ms confirms, and comes back if it does not.
    setText("")
    setRestored(false)
    if (await discussion.comment(sent, parentId)) {
      saveDraft(localStorage, key, "", Date.now())
      props.onDone?.()
    } else {
      setText(sent)
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
          disabled={!text.trim()}
        >
          {parentId === null ? "Post comment" : "Post reply"}
        </button>
        {props.onDone && (
          <button
            type="button"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            onClick={discard}
          >
            Cancel
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          Markdown works here.
        </span>
        {restored && (
          <span className="text-xs text-muted-foreground">
            Draft restored ·{" "}
            <button type="button" className="readable-link" onClick={discard}>
              Discard
            </button>
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          We keep it friendly here.
        </span>{" "}
        Assume the other person means well.{" "}
        <a
          className="readable-link"
          href={`${siteConfig.zap.url}/guidelines`}
          target="_blank"
          rel="noreferrer"
        >
          Community guidelines
        </a>
      </p>
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
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const signedIn = session.status === "signed-in" && !comment.pending
  const isMine =
    session.status === "signed-in" && comment.author === session.username
  const canDelete =
    signedIn && isMine && (discussion.mine.deletable ?? []).includes(comment.id)
  // Offered only once zap.ms reports flags, and never on your own comment.
  const flagged = (discussion.mine.flagged ?? []).includes(comment.id)
  const canFlag =
    signedIn &&
    !isMine &&
    comment.author !== null &&
    discussion.mine.flagged !== undefined
  const quiet =
    "rounded px-1 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
  const upvoted = discussion.mine.commentVotes[comment.id] === "up"
  const links = zapLinks(siteConfig.zap.url, postId)
  const name = comment.author ?? "removed"
  const html = React.useMemo(
    () => sanitizeCommentHtml(comment.html),
    [comment.html]
  )

  return (
    <article
      id={`comment-${comment.id}`}
      className={cn("flex scroll-mt-24 gap-3", comment.pending && "opacity-70")}
    >
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
          {comment.pending ? (
            <span className="text-muted-foreground" role="status">
              Posting…
            </span>
          ) : (
            <a
              className="text-muted-foreground underline-offset-4 hover:underline"
              href={comment.url}
            >
              {timeAgo(comment.createdAt)}
            </a>
          )}
          {comment.pending ? null : session.status === "signed-in" &&
            comment.author ? (
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
          {comment.pending ? null : session.status === "off" ? (
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
          {canFlag &&
            (flagged ? (
              <span className="px-1 text-muted-foreground">flagged</span>
            ) : (
              <button
                type="button"
                className={quiet}
                aria-label={`Flag ${name}'s comment for the moderators`}
                onClick={() => discussion.flag(comment.id)}
              >
                flag
              </button>
            ))}
          {canDelete &&
            (confirmingDelete ? (
              <span className="inline-flex items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    quiet,
                    "text-destructive hover:text-destructive"
                  )}
                  onClick={() => {
                    setConfirmingDelete(false)
                    discussion.remove(comment.id)
                  }}
                >
                  delete it
                </button>
                <button
                  type="button"
                  className={quiet}
                  onClick={() => setConfirmingDelete(false)}
                >
                  keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                className={quiet}
                aria-label="Delete your comment"
                onClick={() => setConfirmingDelete(true)}
              >
                delete
              </button>
            ))}
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
