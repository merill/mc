"use client"

import * as React from "react"
import { ArrowRight } from "lucide-react"

import { siteConfig } from "@/config/site"
import { useZap } from "@/lib/use-zap"
import { cn } from "@/lib/utils"
import { ZapActiveItem, avatarColor, timeAgo, zapLinks } from "@/lib/zap"

const VISIBLE_ON_PHONES = 5

/**
 * The Message Center posts people are discussing on zap.ms right now. Renders
 * nothing while loading, when zap.ms cannot be reached, or on a quiet day, so
 * the home page never shows an empty box.
 */
export default function ActiveDiscussions() {
  const state = useZap<{ items: ZapActiveItem[] }>("/mc/active")
  if (state.status !== "ready" || state.data.items.length === 0) return null

  const items = state.data.items
  const links = zapLinks(siteConfig.zap.url, "")
  const first = items.slice(0, VISIBLE_ON_PHONES)
  const rest = items.slice(VISIBLE_ON_PHONES)

  return (
    <section
      aria-labelledby="active-discussions-title"
      className="min-w-0 overflow-hidden rounded-[0.5rem] border bg-background shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-4 py-3 sm:px-5">
        <h2
          id="active-discussions-title"
          className="text-lg font-semibold tracking-tight"
        >
          Active discussions
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            on zap.ms
          </span>
        </h2>
        <a
          className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          href={links.section}
        >
          All Message Center discussions
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      </div>

      <ul className={cn("-mb-px grid", items.length > 1 && "lg:grid-cols-2")}>
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
            <span className="group-open:hidden">Show {rest.length} more</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <ul>
            {rest.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function Row({ item, className }: { item: ZapActiveItem; className?: string }) {
  return (
    <li className={className}>
      <a
        href={item.url}
        className="group flex h-full flex-col gap-1 border-b px-4 py-3 hover:bg-muted/40 sm:px-5"
      >
        <p className="line-clamp-2 text-sm leading-5">
          <span className="font-medium tabular-nums">{item.id}</span>{" "}
          <span className="text-foreground/85 group-hover:underline">
            {item.title}
          </span>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
          <span aria-label={`${item.up} likes`}>👍 {item.up}</span>
          <span aria-label={`${item.down} dislikes`}>👎 {item.down}</span>
          <span aria-label={`${item.commentCount} comments`}>
            💬 {item.commentCount}
          </span>
          {item.lastCommenter && (
            <span className="inline-flex items-center gap-1">
              <span
                className="flex size-4 items-center justify-center rounded-full text-[9px] font-semibold uppercase text-white"
                style={{ backgroundColor: avatarColor(item.lastCommenter) }}
                aria-hidden="true"
              >
                {item.lastCommenter.slice(0, 1)}
              </span>
              {item.lastCommenter}
            </span>
          )}
          <span>{timeAgo(item.lastActivityAt)}</span>
        </p>
      </a>
    </li>
  )
}
