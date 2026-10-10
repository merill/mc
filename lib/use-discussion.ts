"use client"

import * as React from "react"

import { siteConfig } from "@/config/site"
import type { ZapDiscussion } from "@/lib/zap"

/**
 * One post's discussion plus the visitor's part in it.
 *
 * Reading comes from zap.ms's public API, as before. Signing in, reacting and
 * commenting go to `/zap/*` on this site's own address, which zap.ms answers
 * (see zap's docs/architecture.md). When that path is not there, for example
 * in local development, `session` is "off" and callers fall back to links.
 */

export type Reaction = "up" | "down"

export type ZapSession =
  | { status: "checking" }
  | { status: "off" }
  | { status: "signed-out" }
  | { status: "signed-in"; username: string }

export type ZapMine = {
  reaction: Reaction | null
  commentVotes: Record<string, Reaction>
}

export type DiscussionState = {
  thread:
    | { status: "loading" }
    | { status: "ready"; data: ZapDiscussion }
    | { status: "unavailable" }
  session: ZapSession
  mine: ZapMine
  busy: boolean
  error: string | null
}

type Pending = { id: string; react?: Reaction }
type WriteResult = { thread: ZapDiscussion | null; mine: ZapMine }

const EMBED = "/zap"
const PENDING_KEY = "zap-pending"
const NO_VOTES: ZapMine = { reaction: null, commentVotes: {} }
const GENERIC_ERROR = "That did not go through. Try again in a moment."

let session: ZapSession = { status: "checking" }
let sessionRequest: Promise<void> | null = null
const stores = new Map<string, Store>()

class Store {
  state: DiscussionState = {
    thread: { status: "loading" },
    session,
    mine: NO_VOTES,
    busy: false,
    error: null,
  }
  private listeners = new Set<() => void>()
  private started = false

  constructor(readonly id: string) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    this.start()
    return () => this.listeners.delete(listener)
  }

  snapshot = () => this.state

  set(patch: Partial<DiscussionState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener())
  }

  private start() {
    if (this.started) return
    this.started = true

    fetch(`${siteConfig.zap.url}/api/v1/mc/${this.id}`, { credentials: "omit" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: ZapDiscussion) => {
        // A write may have answered first with something newer.
        if (this.state.thread.status === "loading") {
          this.set({ thread: { status: "ready", data } })
        }
      })
      .catch(() => {
        if (this.state.thread.status === "loading") {
          this.set({ thread: { status: "unavailable" } })
        }
      })

    loadSession().then(() => this.signedIn())
  }

  /** Loads the visitor's own votes, then finishes what they started. */
  private async signedIn() {
    if (session.status !== "signed-in") return
    const mine = await call<ZapMine>("GET", `/api/v1/mc/${this.id}/me`)
    if (mine.ok) this.set({ mine: mine.data })

    const pending = takePending()
    if (pending?.id === this.id && pending.react) {
      await this.write("PUT", "/reaction", { dir: pending.react })
    }
  }

  async write(method: "PUT" | "POST", path: string, body: unknown) {
    this.set({ busy: true, error: null })
    const result = await call<WriteResult>(
      method,
      `/api/v1/mc/${this.id}${path}`,
      body
    )
    if (result.ok) {
      const { thread, mine } = result.data
      this.set({
        busy: false,
        mine,
        thread: thread ? { status: "ready", data: thread } : this.state.thread,
      })
      return true
    }
    if (result.status === 401) setSession({ status: "signed-out" })
    this.set({
      busy: false,
      error:
        result.status === 401
          ? "Your sign-in has expired. Sign in again to continue."
          : result.message ?? GENERIC_ERROR,
    })
    return false
  }
}

function setSession(next: ZapSession) {
  session = next
  stores.forEach((store) => store.set({ session }))
}

function loadSession(): Promise<void> {
  sessionRequest ??= call<{ user: { username: string | null } | null }>(
    "GET",
    "/api/v1/me"
  ).then((result) => {
    if (!result.ok) return setSession({ status: "off" })
    const username = result.data.user?.username
    setSession(
      username ? { status: "signed-in", username } : { status: "signed-out" }
    )
  })
  return sessionRequest
}

type CallResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message?: string }

async function call<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<CallResult<T>> {
  try {
    const response = await fetch(`${EMBED}${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    // Without zap's route this path is the site's own 404 page, not JSON.
    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json")
    if (!isJson) return { ok: false, status: response.status }
    const data = await response.json()
    if (!response.ok) {
      return { ok: false, status: response.status, message: data?.message }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, status: 0 }
  }
}

function takePending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as Pending) : null
  } catch {
    return null
  }
}

/** Goes to zap.ms to sign in and comes back to this post's discussion. */
function signIn(pending: Pending) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  } catch {
    // Without storage they sign in and press the button again.
  }
  const here = `${window.location.pathname}${window.location.search}#discussion`
  window.location.assign(
    `${EMBED}/auth/start?returnTo=${encodeURIComponent(here)}`
  )
}

export function useDiscussion(id: string) {
  let store = stores.get(id)
  if (!store) {
    store = new Store(id)
    stores.set(id, store)
  }
  const current = store
  const state = React.useSyncExternalStore(
    current.subscribe,
    current.snapshot,
    current.snapshot
  )

  const actions = React.useMemo(
    () => ({
      signIn: () => signIn({ id }),
      /** Pressing the reaction you already gave takes it back. */
      react: (dir: Reaction) => {
        if (session.status !== "signed-in") return signIn({ id, react: dir })
        const next = current.state.mine.reaction === dir ? null : dir
        return current.write("PUT", "/reaction", { dir: next })
      },
      comment: (text: string, parentId: number | null) =>
        current.write("POST", "/comments", { text, parentId }),
      upvote: (commentId: number) =>
        current.write("POST", `/comments/${commentId}/vote`, { dir: "up" }),
      signOut: async () => {
        await call("POST", "/auth/signout", {})
        current.set({ mine: NO_VOTES })
        setSession({ status: "signed-out" })
      },
    }),
    [current, id]
  )

  return { ...state, ...actions }
}
