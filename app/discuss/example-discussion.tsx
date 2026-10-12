import { MessageSquare, Reply, ThumbsDown, ThumbsUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { BADGE_LABELS, avatarColor } from "@/lib/zap"

type Example = {
  name: string
  badge?: "mvp" | "microsoft"
  when: string
  text: string[]
  likes: number
  replies?: Example[]
}

// Invented people and an invented thread, written to read like the real ones.
const THREAD: Example[] = [
  {
    name: "Priya Nair",
    badge: "mvp",
    when: "2 days ago",
    text: [
      "This reached our tenant on Monday. Heads up: the registration campaign switched itself on, and about 300 people were asked to set up a passkey at sign-in the next morning.",
      "If you are not ready for that, exclude a group or turn the campaign off before the rollout date.",
    ],
    likes: 18,
    replies: [
      {
        name: "Daniel Kowalski",
        when: "2 days ago",
        text: [
          "Same here. Our help desk had 40 calls before 9am. Did excluding a group work for you?",
        ],
        likes: 6,
        replies: [
          {
            name: "Priya Nair",
            badge: "mvp",
            when: "1 day ago",
            text: [
              "Yes, nobody in the excluded group was prompted. Remember your break-glass accounts.",
            ],
            likes: 9,
          },
        ],
      },
    ],
  },
  {
    name: "Sam Ortega",
    badge: "microsoft",
    when: "1 day ago",
    text: [
      "Thanks for the reports, they helped. The post now lists the dates for each cloud, and the documentation calls out the exclusion option.",
    ],
    likes: 14,
  },
  {
    name: "Maria Lindqvist",
    when: "5 hours ago",
    text: [
      "Not in our GCC tenant yet as of today. I will report back when it lands.",
    ],
    likes: 3,
  },
]

const pill =
  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium tabular-nums"

/**
 * A made-up discussion, drawn the way a real one looks on a post's page, to
 * show what liking, commenting and replying are for. Nothing in it can be
 * pressed.
 */
export function ExampleDiscussion() {
  return (
    <figure className="min-w-0 overflow-hidden rounded-[0.5rem] border bg-background shadow-sm">
      <div className="border-b bg-muted/40 px-4 py-3 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Example
        </p>
        <p className="mt-1 font-semibold leading-snug">
          Microsoft Entra ID: passkey profiles and the registration campaign
        </p>
        <div
          className="mt-3 flex flex-wrap items-center gap-2"
          aria-hidden="true"
        >
          <span className={pill}>
            <ThumbsUp className="size-4 fill-current text-blue-600 dark:text-blue-400" />
            24
          </span>
          <span className={cn(pill, "text-muted-foreground")}>
            <ThumbsDown className="size-4" />3
          </span>
          <span className="ml-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="size-4" />5 comments
          </span>
        </div>
      </div>
      <div className="space-y-5 px-4 py-4 sm:px-5">
        {THREAD.map((comment) => (
          <ExampleComment key={comment.name + comment.when} comment={comment} />
        ))}
      </div>
      <figcaption className="border-t px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
        An illustration with invented names. Real discussions sit under each
        post.
      </figcaption>
    </figure>
  )
}

function ExampleComment({ comment }: { comment: Example }) {
  return (
    <div className="flex gap-3">
      <span
        className="mt-0.5 flex size-7 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
        style={{ backgroundColor: avatarColor(comment.name) }}
        aria-hidden="true"
      >
        {comment.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-7">
          <span className="font-semibold">{comment.name}</span>
          {comment.badge && (
            <span
              className={cn(
                "rounded-full px-2 py-px text-xs font-semibold text-white",
                comment.badge === "microsoft" ? "bg-[#0078d4]" : "bg-[#b31b1b]"
              )}
            >
              {BADGE_LABELS[comment.badge] ?? comment.badge}
            </span>
          )}
          <span className="text-muted-foreground">{comment.when}</span>
        </div>
        <div className="zap-comment">
          {comment.text.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div
          className="mt-2 flex items-center gap-3 text-xs font-medium text-muted-foreground"
          aria-hidden="true"
        >
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <ThumbsUp className="size-3.5" />
            {comment.likes}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Reply className="size-3.5" />
            Reply
          </span>
        </div>
        {comment.replies && (
          <div className="mt-4 space-y-4 border-l pl-4">
            {comment.replies.map((reply) => (
              <ExampleComment key={reply.name + reply.when} comment={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
