"use client"

import * as React from "react"

import { siteConfig } from "@/config/site"
import { COUNTS_BATCH, countsPath, type ZapCounts } from "@/lib/zap"
import { COUNTS_TTL_MS, recentCounts } from "@/lib/zap-local"

/**
 * Likes, dislikes and comment counts for the posts a list has on screen.
 *
 * The list names its posts with `useZapCounts`; each row reads its own with
 * `useZapCount`. zap.ms is asked once per post per ten minutes, in batches,
 * and keeps its own answer for as long, so counts can trail by that much. The
 * visitor's own recent like or comment (`zap-local.ts`) is laid on top, so
 * what they just did is never missing.
 */

/** What zap.ms last said, for posts with something to show. */
const fetched = new Map<string, ZapCounts>()
/** When each post was last asked about, answered yet or not. */
const asked = new Map<string, number>()
let wanted: string[] = []
let shown: Record<string, ZapCounts> = {}
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publish() {
  const now = Date.now()
  const next: Record<string, ZapCounts> = {}
  for (const id of wanted) {
    const counts = recentCounts(localStorage, id, now) ?? fetched.get(id)
    if (counts && counts.up + counts.down + counts.commentCount > 0) {
      next[id] = counts
    }
  }
  shown = next
  listeners.forEach((listener) => listener())
}

async function load(ids: string[]) {
  const now = Date.now()
  ids.forEach((id) => asked.set(id, now))
  try {
    const response = await fetch(
      `${siteConfig.zap.url}/api/v1${countsPath(ids)}`,
      { credentials: "omit" }
    )
    if (!response.ok) throw new Error()
    const { counts } = (await response.json()) as {
      counts: Record<string, ZapCounts>
    }
    for (const id of ids) {
      if (counts[id]) fetched.set(id, counts[id])
      else fetched.delete(id)
    }
    publish()
  } catch {
    // The list reads fine without counts; the next change of rows asks again.
    ids.forEach((id) => asked.get(id) === now && asked.delete(id))
  }
}

// Rows settle in a few steps as a list loads, sorts and filters. Waiting for
// them means one request, for the same posts every other visitor asks about.
const SETTLE_MS = 300

/** Shows counts for `ids`, the posts on screen, asking zap.ms about new ones. */
export function useZapCounts(ids: string[]) {
  const key = ids.join(",")
  React.useEffect(() => {
    wanted = key ? key.split(",") : []
    publish()
    const timer = setTimeout(() => {
      const now = Date.now()
      const stale = wanted.filter(
        (id) => now - (asked.get(id) ?? -Infinity) > COUNTS_TTL_MS
      )
      for (let at = 0; at < stale.length; at += COUNTS_BATCH) {
        void load(stale.slice(at, at + COUNTS_BATCH))
      }
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [key])
}

/** One post's counts, or null while it has none to show. */
export function useZapCount(id: string): ZapCounts | null {
  return React.useSyncExternalStore(
    subscribe,
    () => shown[id] ?? null,
    () => null
  )
}
