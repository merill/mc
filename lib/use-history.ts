"use client"

import * as React from "react"

import type { Message } from "@/types/message"
import { readPublishedHistory, type PublishedHistory } from "@/lib/history"
import { call } from "@/lib/use-discussion"

/**
 * A post's past versions, for a signed-in visitor.
 *
 * zap.ms keeps them and answers on this site's own `/zap` path, so the request
 * carries the visitor's session. Nothing is asked for until `enabled` is true:
 * a signed-out visitor, a crawler, or someone who never opens a version costs
 * no request at all.
 */
export type HistoryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; history: PublishedHistory<Message> }
  /** The session ended since the page loaded. */
  | { status: "signed-out" }
  /** zap.ms has no versions for this post yet. */
  | { status: "missing" }
  | { status: "error" }

type Settled = Exclude<HistoryState, { status: "idle" | "loading" }>

// One request per post per page view, shared by everything that asks.
const requests = new Map<string, Promise<Settled>>()

function load(id: string): Promise<Settled> {
  let request = requests.get(id)
  if (!request) {
    request = call<unknown>("GET", `/api/v1/mc/${id}/history`).then(
      (result): Settled => {
        if (result.ok) {
          const history = readPublishedHistory<Message>(result.data)
          return history ? { status: "ready", history } : { status: "error" }
        }
        if (result.status === 401) return { status: "signed-out" }
        if (result.status === 404) return { status: "missing" }
        return { status: "error" }
      }
    )
    requests.set(id, request)
    // Only an answer worth keeping is kept; anything else can be asked again.
    request.then((state) => {
      if (state.status !== "ready") requests.delete(id)
    })
  }
  return request
}

export function useHistory(id: string, enabled: boolean) {
  const [state, setState] = React.useState<HistoryState>({ status: "idle" })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!enabled) return
    let isMounted = true
    setState({ status: "loading" })
    load(id).then((next) => isMounted && setState(next))
    return () => {
      isMounted = false
    }
  }, [id, enabled, attempt])

  return { state, retry: () => setAttempt((count) => count + 1) }
}

/**
 * The inline diff of two message bodies: additions in `<ins>`, removals in
 * `<del>`. The diff library is fetched the first time a comparison is opened,
 * so it stays out of every other page view.
 */
export function useBodyDiff(oldHtml: string, newHtml: string): string | null {
  const [diff, setDiff] = React.useState<string | null>(null)

  React.useEffect(() => {
    let isMounted = true
    setDiff(null)
    import("node-htmldiff")
      .then(({ default: htmldiff }) => htmldiff(oldHtml, newHtml))
      // Without the library the newer body is still worth showing.
      .catch(() => newHtml)
      .then((html) => isMounted && setDiff(html))
    return () => {
      isMounted = false
    }
  }, [oldHtml, newHtml])

  return diff
}
