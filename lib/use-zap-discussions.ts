"use client"

import * as React from "react"

import { useZap } from "@/lib/use-zap"
import type { ZapActiveItem } from "@/lib/zap"

/**
 * The discussions zap.ms lists for this site: the hot ones and the ones with
 * a question waiting. The home page's "What admins are saying" box and the
 * table's Discussed and Questions views read the same two requests, and every
 * row of the table can quote a post found in either.
 */

export type DiscussionList = "hot" | "questions"

/** Up to 30, which is all zap.ms gives in one list. */
const LIMIT = 30

const known = new Map<string, ZapActiveItem>()
const listeners = new Set<() => void>()
let version = 0

function remember(items: ZapActiveItem[]) {
  let changed = false
  for (const item of items) {
    if (known.get(item.id) !== item) {
      known.set(item.id, item)
      changed = true
    }
  }
  if (changed) {
    version++
    listeners.forEach((listener) => listener())
  }
}

/** One of zap.ms's lists, or null while it loads or when zap.ms is away. */
export function useDiscussions(list: DiscussionList): ZapActiveItem[] | null {
  const state = useZap<{ items: ZapActiveItem[] }>(
    `/mc/active?show=${list}&limit=${LIMIT}`
  )
  const items = state.status === "ready" ? state.data.items : null
  React.useEffect(() => {
    if (items) remember(items)
  }, [items])
  return items
}

/** What zap.ms said about one post in either list, if it is in one. */
export function useDiscussion(id: string): ZapActiveItem | null {
  React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => version,
    () => 0
  )
  return known.get(id) ?? null
}
