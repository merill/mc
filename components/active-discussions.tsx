"use client"

import * as React from "react"
import { ArrowRight, MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react"

import { siteConfig } from "@/config/site"
import { useZapSession } from "@/lib/use-discussion"
import { useZap } from "@/lib/use-zap"
import { cn } from "@/lib/utils"
import { ZapActiveItem, timeAgo, zapLinks } from "@/lib/zap"
import { overlayRecent } from "@/lib/zap-local"
import { buttonVariants } from "@/components/ui/button"
import { ZapAvatar } from "@/components/zap-avatar"

const VISIBLE_ON_PHONES = 5

/**
 * The invitation at the top of the home page to like and comment on posts,
 * with the way to sign in, over the Message Center posts people are
 * discussing on zap.ms right now. The invitation is always there; the list
 * is left out while loading, when zap.ms cannot be reached, or on a quiet day.
 */
export default function ActiveDiscussions() {
  const state = useZap<{ items: ZapActiveItem[] }>("/mc/active")
  const { session, signIn } = useZapSession()

  // Counts from the shared list can trail this visitor's own like or comment.
  const items =
    state.status === "ready"
      ? overlayRecent(state.data.items, localStorage, Date.now())
      : []
  const links = zapLinks(siteConfig.zap.url, "")
  const first = items.slice(0, VISIBLE_ON_PHONES)
  const rest = items.slice(VISIBLE_ON_PHONES)
  const signedIn = session.status === "signed-in"

  return (
    <section
      aria-labelledby="join-in-title"
      className="min-w-0 overflow-hidden rounded-[0.5rem] border bg-background shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 bg-muted/40 px-4 py-4 sm:px-5">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <MessageSquare className="size-5" />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <h2
            id="join-in-title"
            className="text-lg font-semibold tracking-tight"
          >
            Have questions or thoughts?
          </h2>
          <p className="text-sm text-muted-foreground">
            {signedIn
              ? "Open any Message Center post to like it, comment or ask a question."
              : "You can now like and comment on Message Center posts, and ask the community what a change means for you."}
          </p>
        </div>
        {/* Only once zap.ms has said nobody is signed in, so the button never
            flashes up for someone who is. */}
        {session.status === "signed-out" && (
          <button
            type="button"
            className={buttonVariants({ size: "sm" })}
            onClick={signIn}
          >
            Sign in to get started
          </button>
        )}
      </div>

      {items.length > 0 && (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-y px-4 py-2.5 sm:px-5">
            <h3 className="text-sm font-semibold">Active discussions</h3>
            <a
              className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
              href={links.section}
            >
              All Message Center discussions
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          <ul
            className={cn("-mb-px grid", items.length > 1 && "lg:grid-cols-2")}
          >
            {first.map((item) => (
              <Row key={item.id} item={item} />
            ))}
            {/* Phones start with five; larger screens always show the rest. */}
            {rest.map((item) => (
              <Row key={item.id} item={item} className="hidden sm:block" />
            ))}
          </ul>
          {rest.length > 0 && (
            <details className="group border-t sm:hidden">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">
                  Show {rest.length} more
                </span>
                <span className="hidden group-open:inline">Show fewer</span>
              </summary>
              <ul>
                {rest.map((item) => (
                  <Row key={item.id} item={item} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  )
}

function Row({ item, className }: { item: ZapActiveItem; className?: string }) {
  return (
    <li className={className}>
      {/* Reading stays on this site: the post's page, at its discussion. A
          plain link, because next/link can fall back to a full page load that
          drops the #discussion it was given. */}
      <a
        href={zapLinks(siteConfig.zap.url, item.id).local}
        className="group flex h-full flex-col gap-1 border-b px-4 py-3 hover:bg-muted/40 sm:px-5"
      >
        <p className="line-clamp-2 text-sm leading-5">
          <span className="font-medium tabular-nums">{item.id}</span>{" "}
          <span className="text-foreground/85 group-hover:underline">
            {item.title}
          </span>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
          <span
            className="inline-flex items-center gap-1"
            aria-label={`${item.up} likes`}
          >
            <ThumbsUp className="size-3.5" aria-hidden="true" /> {item.up}
          </span>
          <span
            className="inline-flex items-center gap-1"
            aria-label={`${item.down} dislikes`}
          >
            <ThumbsDown className="size-3.5" aria-hidden="true" /> {item.down}
          </span>
          <span
            className="inline-flex items-center gap-1"
            aria-label={`${item.commentCount} comments`}
          >
            <MessageSquare className="size-3.5" aria-hidden="true" />{" "}
            {item.commentCount}
          </span>
          {item.lastCommenter && (
            <span className="inline-flex items-center gap-1">
              <ZapAvatar
                username={item.lastCommenter}
                src={item.lastCommenterAvatar}
                className="size-4 text-[9px]"
              />
              {item.lastCommenter}
            </span>
          )}
          <span>{timeAgo(item.lastActivityAt)}</span>
        </p>
      </a>
    </li>
  )
}
