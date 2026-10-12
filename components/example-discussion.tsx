import { MessageSquare, Reply, ThumbsDown, ThumbsUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { BADGE_LABELS } from "@/lib/zap"

type Face = {
  /** Behind the portrait. */
  backdrop: string
  skin: string
  hair: string
  shirt: string
  style: "long" | "short" | "bob"
  beard?: boolean
  glasses?: boolean
}

// Drawn portraits for the invented people, standing in for the profile photos
// real members bring from LinkedIn.
const FACES: Record<string, Face> = {
  "Priya Nair": {
    backdrop: "#fde68a",
    skin: "#c68863",
    hair: "#2b1d16",
    shirt: "#0f766e",
    style: "long",
  },
  "Daniel Kowalski": {
    backdrop: "#bfdbfe",
    skin: "#f1c9a5",
    hair: "#8a5a2b",
    shirt: "#1e3a8a",
    style: "short",
    beard: true,
    glasses: true,
  },
  "Maria Lindqvist": {
    backdrop: "#fecdd3",
    skin: "#f6d3b8",
    hair: "#e3b655",
    shirt: "#9f1239",
    style: "bob",
  },
}

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
            <MessageSquare className="size-4" />4 comments
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
      <Portrait name={comment.name} />
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

const FRINGE =
  "M12.5 16 Q12.5 7.5 20 7.5 Q27.5 7.5 27.5 16 Q24 11.5 20 11.5 Q16 11.5 12.5 16Z"

/** A small drawn portrait in a circle, the size of a comment's photo. */
function Portrait({ name }: { name: string }) {
  const face = FACES[name]
  if (!face) return null
  const id = `portrait-${name.replace(/\W+/g, "-").toLowerCase()}`
  return (
    <svg
      viewBox="0 0 40 40"
      className="mt-0.5 size-8 shrink-0 rounded-full"
      aria-hidden="true"
    >
      <clipPath id={id}>
        <circle cx="20" cy="20" r="20" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="40" height="40" fill={face.backdrop} />
        {face.style === "long" && (
          <path
            d="M10.5 17 Q10.5 6.5 20 6.5 Q29.5 6.5 29.5 17 L30.5 34 H9.5Z"
            fill={face.hair}
          />
        )}
        {face.style === "bob" && (
          <path
            d="M11 17 Q11 6.5 20 6.5 Q29 6.5 29 17 L29 25 H11Z"
            fill={face.hair}
          />
        )}
        <ellipse cx="20" cy="42" rx="15" ry="11" fill={face.shirt} />
        <rect x="17" y="23" width="6" height="8" rx="2.5" fill={face.skin} />
        <ellipse cx="20" cy="17.5" rx="7" ry="8" fill={face.skin} />
        {face.beard && (
          <path
            d="M13.2 19 Q13.5 26.5 20 26.5 Q26.5 26.5 26.8 19 Q24.5 22.2 20 22.2 Q15.5 22.2 13.2 19Z"
            fill={face.hair}
          />
        )}
        <path d={FRINGE} fill={face.hair} />
        <circle cx="17.1" cy="17.6" r="0.8" fill="#1f2937" />
        <circle cx="22.9" cy="17.6" r="0.8" fill="#1f2937" />
        {!face.beard && (
          <path
            d="M17.6 21 Q20 22.8 22.4 21"
            fill="none"
            stroke="#1f2937"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        )}
        {face.glasses && (
          <g fill="none" stroke="#1f2937" strokeWidth="0.8">
            <circle cx="17.1" cy="17.6" r="2.4" />
            <circle cx="22.9" cy="17.6" r="2.4" />
            <path d="M19.5 17.6h1" />
          </g>
        )}
      </g>
    </svg>
  )
}
