"use client"

import * as React from "react"
import { ArrowLeftRight, GitCompare, History, Lock, X } from "lucide-react"

import { Message } from "@/types/message"
import {
  historyHref,
  versionAt,
  type HistoryRequest,
  type VersionEntry,
} from "@/lib/history"
import {
  getDetailValue,
  getFormattedDate,
  linkifyIds,
} from "@/lib/message-format"
import { useZapSession } from "@/lib/use-discussion"
import { useBodyDiff, useHistory } from "@/lib/use-history"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import MessageContent from "@/app/message/[id]/components/message-content"
import MetadataDiff from "@/app/message/[id]/components/metadata-diff"

type Open = (request: HistoryRequest | null) => void

/**
 * Shows one past version, or what changed between two, under the timeline.
 *
 * The timeline is part of the page and open to everyone. What a version said
 * is kept by zap.ms and fetched here for a signed-in visitor; anyone else sees
 * what they would get and a way to sign in, which brings them back to the same
 * version.
 */
export default function VersionViewer(props: {
  id: string
  /** Oldest first. */
  entries: VersionEntry[]
  request: HistoryRequest
  /** Message Center ids this post mentions, which are safe to link. */
  linkableIds: string[]
  onOpen: Open
}) {
  const { id, entries, request, onOpen } = props
  const { session, signIn } = useZapSession()
  const signedIn = session.status === "signed-in"
  const { state, retry } = useHistory(id, signedIn)
  const linkable = React.useMemo(
    () => new Set(props.linkableIds),
    [props.linkableIds]
  )
  const link = (html: string | undefined) =>
    linkifyIds(html ?? "", (mcId) => linkable.has(mcId), id)
  const label = (number: number) =>
    entries.find((entry) => entry.number === number)?.label ?? ""
  const latest = entries[entries.length - 1].number

  let content: React.ReactNode
  if (session.status === "off") {
    content = (
      <Notice>
        Past versions cannot be loaded right now. Try again in a little while.
      </Notice>
    )
  } else if (
    session.status === "signed-out" ||
    state.status === "signed-out"
  ) {
    content = (
      <LockedPreview
        request={request}
        expired={state.status === "signed-out"}
        onSignIn={signIn}
      />
    )
  } else if (state.status === "error") {
    content = (
      <Notice>
        The versions did not load.{" "}
        <button type="button" className="readable-link" onClick={retry}>
          Try again
        </button>
      </Notice>
    )
  } else if (state.status !== "ready") {
    content =
      state.status === "missing" ? (
        <NotPublished />
      ) : (
        <p className="text-sm text-muted-foreground" role="status">
          Loading…
        </p>
      )
  } else if (request.kind === "snapshot") {
    const version = versionAt(state.history, request.version)
    content = version ? (
      <Snapshot
        id={id}
        message={version.message}
        number={request.version}
        label={label(request.version)}
        latest={latest}
        html={link(version.message.Body?.Content)}
        onOpen={onOpen}
      />
    ) : (
      <NotPublished />
    )
  } else {
    const from = versionAt(state.history, request.from)
    const to = versionAt(state.history, request.to)
    content =
      from && to ? (
        <Comparison from={from.message} to={to.message} link={link} />
      ) : (
        <NotPublished />
      )
  }

  return (
    <section
      aria-label="Version viewer"
      className="space-y-4 rounded-md border border-border bg-background p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-foreground">
          {request.kind === "snapshot" ? (
            <>
              <History size={16} aria-hidden="true" />
              Version {request.version}
              <span className="font-normal text-muted-foreground">
                {label(request.version)}
              </span>
            </>
          ) : (
            <>
              <GitCompare size={16} aria-hidden="true" />
              Version {request.from} to version {request.to}
              <span className="font-normal text-muted-foreground">
                {label(request.from)} → {label(request.to)}
              </span>
            </>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {request.kind === "compare" && (
            <a
              href={historyHref(id, {
                kind: "compare",
                from: request.to,
                to: request.from,
              })}
              onClick={(event) => {
                event.preventDefault()
                onOpen({ kind: "compare", from: request.to, to: request.from })
              }}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 gap-1.5"
              )}
            >
              <ArrowLeftRight size={14} aria-hidden="true" /> Swap
            </a>
          )}
          <button
            type="button"
            onClick={() => onOpen(null)}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 gap-1.5"
            )}
          >
            <X size={14} aria-hidden="true" /> Close
          </button>
        </div>
      </div>
      {content}
    </section>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

/** zap.ms receives new versions hourly, a little after the post changes. */
function NotPublished() {
  return (
    <Notice>
      This version is not available yet. New versions arrive within the hour.
    </Notice>
  )
}

/**
 * What a signed-out visitor sees in place of a version: the shape of a
 * comparison, out of focus, and the way to sign in.
 */
function LockedPreview(props: {
  request: HistoryRequest
  expired: boolean
  onSignIn: () => void
}) {
  const { request } = props
  const what =
    request.kind === "snapshot"
      ? `open version ${request.version}`
      : `see what changed between version ${request.from} and version ${request.to}`
  // Bar widths and which bars read as added or removed text.
  const lines: [string, "" | "ins" | "del"][] = [
    ["w-11/12", ""],
    ["w-4/5", "del"],
    ["w-10/12", "ins"],
    ["w-full", ""],
    ["w-2/3", ""],
    ["w-9/12", "ins"],
    ["w-11/12", ""],
    ["w-1/2", "del"],
  ]

  return (
    <div className="relative overflow-hidden rounded-md border border-dashed border-border">
      <div
        aria-hidden="true"
        className="select-none space-y-3 p-5 opacity-70 blur-[3px]"
      >
        {lines.map(([width, kind], index) => (
          <div
            key={index}
            className={cn(
              "h-3.5 rounded",
              width,
              kind === "ins"
                ? "bg-emerald-200 dark:bg-emerald-900/60"
                : kind === "del"
                ? "bg-rose-200 dark:bg-rose-900/60"
                : "bg-muted-foreground/20"
            )}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 p-4 text-center">
        <p className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Lock size={16} aria-hidden="true" />
          {props.expired ? "Sign in again" : "Sign in"} to {what}
        </p>
        <p className="max-w-prose text-sm text-muted-foreground">
          The list of versions is open to everyone. Opening a version or
          comparing two is free with a zap.ms account, the same sign-in as for
          likes and comments.
        </p>
        <button
          type="button"
          className={buttonVariants({ size: "sm" })}
          onClick={props.onSignIn}
        >
          Sign in
        </button>
      </div>
    </div>
  )
}

function Snapshot(props: {
  id: string
  message: Message
  number: number
  label: string
  latest: number
  /** The body, with Message Center ids already linked. */
  html: string
  onOpen: Open
}) {
  const { message, number, latest } = props
  const compare: HistoryRequest = { kind: "compare", from: number, to: latest }
  const facts: [string, string][] = [
    ["Published", getFormattedDate(message.StartDateTime)],
    ["Last updated", getFormattedDate(message.LastModifiedDateTime)],
    ["Services", (message.Services ?? []).join(", ")],
    ["Tags", (message.Tags ?? []).join(", ")],
    ["Status", getDetailValue(message, "Status")],
    ["Release", getDetailValue(message, "ReleasePhase")],
    ["Act by", getFormattedDate(message.ActionRequiredByDateTime)],
  ]

  return (
    <div className="space-y-4">
      {number !== latest && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <span>
            This is how the post read on <strong>{props.label}</strong>. It has
            changed since.
          </span>
          <a
            href={historyHref(props.id, compare)}
            onClick={(event) => {
              event.preventDefault()
              props.onOpen(compare)
            }}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
          >
            <GitCompare size={14} aria-hidden="true" /> See what changed since
          </a>
        </div>
      )}
      <p className="text-lg font-semibold leading-7 text-foreground">
        {message.Title}
      </p>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {facts
          .filter(([, value]) => value)
          .map(([name, value]) => (
            <div key={name} className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {name}
              </dt>
              <dd className="break-words text-foreground/90">{value}</dd>
            </div>
          ))}
      </dl>
      <div className="border-t border-border pt-4">
        <MessageContent html={props.html} />
      </div>
    </div>
  )
}

function Comparison(props: {
  from: Message
  to: Message
  link: (html: string | undefined) => string
}) {
  const diff = useBodyDiff(
    props.from.Body?.Content ?? "",
    props.to.Body?.Content ?? ""
  )

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">
          Metadata changes
        </h4>
        <MetadataDiff oldMessage={props.from} newMessage={props.to} />
      </div>
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h4 className="text-sm font-semibold text-foreground">
            Body changes
          </h4>
          <span className="flex items-center gap-2 text-xs">
            <span className="diff-del">removed text</span>
            <span className="diff-ins">added text</span>
          </span>
        </div>
        {diff === null ? (
          <p className="text-sm text-muted-foreground" role="status">
            Comparing…
          </p>
        ) : (
          <MessageContent html={props.link(diff)} />
        )}
      </div>
    </div>
  )
}
