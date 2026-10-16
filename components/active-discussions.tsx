"use client"

import * as React from "react"
import { ArrowRight, HelpCircle } from "lucide-react"

import { siteConfig } from "@/config/site"
import { useDiscussions } from "@/lib/use-zap-discussions"
import { ZapActiveItem, ZapLine, timeAgo, zapLinks } from "@/lib/zap"
import { Faces } from "@/components/quoted-line"
import { ZapAvatar } from "@/components/zap-avatar"

const CARDS = 3

/**
 * "What admins are saying": the three hottest discussions on zap.ms, each
 * quoting one person's words, and the questions still waiting for an answer.
 * Renders nothing while loading, when zap.ms cannot be reached, or on a quiet
 * week, so the home page never shows an empty box.
 */
export default function ActiveDiscussions() {
  const hot = useDiscussions("hot")
  const questions = useDiscussions("questions")
  // Conversations first; waiting questions have the strip below, and fill
  // the cards only on a week with fewer conversations than cards.
  const quoted = (hot ?? []).filter((item) => item.highlight)
  const cards = [
    ...quoted.filter((item) => item.highlight?.kind !== "question"),
    ...quoted.filter((item) => item.highlight?.kind === "question"),
  ].slice(0, CARDS)
  if (cards.length === 0) return null

  const waiting = questions ?? []
  return (
    <section
      aria-labelledby="active-discussions-title"
      className="min-w-0 overflow-hidden rounded-[0.5rem] border bg-background shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3 sm:px-5">
        <h2
          id="active-discussions-title"
          className="text-lg font-semibold tracking-tight"
        >
          What admins are saying
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            this week
          </span>
        </h2>
        <a
          className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          href="/?show=discussed"
        >
          All discussions
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      </div>
      <ul className="grid lg:grid-cols-3">
        {cards.map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </ul>
      {waiting.length > 0 && (
        <a
          href="/?show=questions"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t bg-amber-500/5 px-4 py-3 text-sm hover:bg-amber-500/10 sm:px-5"
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
            <HelpCircle className="size-4" aria-hidden="true" />
            {waiting.length === 1
              ? "1 question is waiting for an answer"
              : `${waiting.length} questions are waiting for an answer`}
          </span>
          <span className="line-clamp-1 min-w-0 flex-1 text-muted-foreground">
            {waiting
              .slice(0, 2)
              .map((item) => item.highlight && `“${item.highlight.text}”`)
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 font-medium">
            Help answer
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
        </a>
      )}
    </section>
  )
}

/** The line a card quotes: the answer to a question, or the highlight itself. */
function quoted(item: ZapActiveItem): ZapLine | null {
  return item.highlight?.answer ?? item.highlight ?? null
}

function Card({ item }: { item: ZapActiveItem }) {
  const line = quoted(item)
  if (!line) return null
  const people = item.people ?? []
  return (
    <li className="min-w-0 border-b lg:border-b-0 lg:border-r lg:last:border-r-0">
      {/* Reading stays on this site: the post's page, at its discussion. A
          plain link, because next/link can fall back to a full page load that
          drops the #discussion it was given. */}
      <a
        href={zapLinks(siteConfig.zap.url, item.id).local}
        className="group flex h-full flex-col gap-3 p-4 hover:bg-muted/40 sm:p-5"
      >
        <p className="line-clamp-2 text-sm leading-5">
          <span className="font-medium tabular-nums">{item.id}</span>{" "}
          <span className="text-foreground/85 group-hover:underline">
            {item.title}
          </span>
        </p>
        <div className="flex flex-1 gap-2.5">
          <ZapAvatar
            username={line.username}
            name={line.name}
            src={line.avatar}
            className="size-7 text-xs"
          />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
              <span className="font-semibold">{line.name}</span>
              {line.badges.includes("mvp") && (
                <span className="rounded-full bg-[#b31b1b] px-2 py-px text-xs font-semibold text-white">
                  MVP
                </span>
              )}
              {item.highlight?.answer && (
                <span className="text-xs text-muted-foreground">answered</span>
              )}
            </p>
            <p className="mt-0.5 line-clamp-3 text-[15px] leading-6 text-foreground/90">
              {line.text}
            </p>
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
          <Faces people={people} />
          <span>
            {item.commentCount} {item.commentCount === 1 ? "reply" : "replies"}{" "}
            · last {timeAgo(item.lastActivityAt)}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 font-medium text-foreground">
            Join
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
        </p>
      </a>
    </li>
  )
}
