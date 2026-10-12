"use client"

import * as React from "react"

import { call, useZapSession } from "@/lib/use-discussion"
import {
  readSavedViews,
  readViewSettings,
  type SavedView,
  type ViewSettings,
} from "@/lib/views"

/**
 * A signed-in visitor's saved views, kept on zap.ms so they follow the person
 * to any browser.
 *
 * zap.ms is asked as little as possible. The views are also kept in this
 * browser, and the sign-in check every page already makes says when they last
 * changed (`viewsUpdatedAt`); they are fetched only when that is newer than
 * the copy here. An ordinary page load costs zap.ms nothing extra.
 */

const CACHE_KEY = "mc-views"
const ACTIVE_KEY = "mc-active-view"
const PENDING_KEY = "mc-view-pending"
const SAVE_ERROR = "Your views could not be saved. Try again in a moment."

type Cache = { username: string; updatedAt: number; views: SavedView[] }
type ViewsReply = { views?: unknown; updatedAt?: unknown }

export type SavedViewsStatus =
  // zap.ms has not answered yet
  | "checking"
  // no /zap path here (local development) or zap.ms is down: nothing to save to
  | "off"
  | "signed-out"
  | "loading"
  | "ready"

function readCache(username: string): Cache | null {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as Cache
    if (cache?.username !== username || typeof cache.updatedAt !== "number") {
      return null
    }
    return { ...cache, views: readSavedViews(cache.views) }
  } catch {
    return null
  }
}

function writeCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Without storage the views are simply fetched on each visit.
  }
}

function forget() {
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // Nothing was kept.
  }
}

/** The view someone was in last, to open the list in next time. */
export function readActiveView(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function writeActiveView(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // The list then opens in the default view.
  }
}

/**
 * What someone was about to save when they went off to sign in. It stays
 * until they have named it or closed the box, so a reload in between does
 * not lose it.
 */
export function readPendingView(): ViewSettings | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    return raw ? readViewSettings(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function clearPendingView() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // Nothing was kept.
  }
}

export function keepPendingView(settings: ViewSettings) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(settings))
  } catch {
    // They sign in and press Save view again.
  }
}

export function useSavedViews() {
  const { session, signIn } = useZapSession()
  const [views, setViews] = React.useState<SavedView[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const username = session.status === "signed-in" ? session.username : null
  const changedAt = session.status === "signed-in" ? session.viewsUpdatedAt : 0

  React.useEffect(() => {
    if (session.status === "signed-out") forget()
  }, [session.status])

  React.useEffect(() => {
    if (!username) {
      setViews(null)
      return
    }
    const cached = readCache(username)
    // A save made here is newer than what the page was told when it loaded.
    if (cached && cached.updatedAt >= changedAt) {
      setViews(cached.views)
      return
    }
    if (changedAt === 0) {
      setViews([])
      return
    }

    let isMounted = true
    // Show the copy from last time while the newer one is on its way.
    if (cached) setViews(cached.views)
    call<ViewsReply>("GET", "/api/v1/views").then((result) => {
      if (!isMounted) return
      if (!result.ok) {
        if (!cached) setViews([])
        return
      }
      const fresh = readSavedViews(result.data.views)
      setViews(fresh)
      writeCache({
        username,
        updatedAt: Number(result.data.updatedAt) || changedAt,
        views: fresh,
      })
    })
    return () => {
      isMounted = false
    }
  }, [username, changedAt])

  /** Replaces the saved views. Shows at once; goes back if zap.ms refuses. */
  const save = async (next: SavedView[]): Promise<boolean> => {
    if (!username) return false
    const before = views
    setViews(next)
    setError(null)
    const result = await call<ViewsReply>("PUT", "/api/v1/views", {
      views: next,
    })
    if (!result.ok) {
      setViews(before)
      setError(result.message ?? SAVE_ERROR)
      return false
    }
    const saved = readSavedViews(result.data.views)
    setViews(saved)
    writeCache({
      username,
      updatedAt: Number(result.data.updatedAt) || Date.now() / 1000,
      views: saved,
    })
    return true
  }

  const status: SavedViewsStatus =
    session.status !== "signed-in"
      ? session.status
      : views === null
      ? "loading"
      : "ready"

  return { status, views: views ?? [], save, error, signIn }
}
