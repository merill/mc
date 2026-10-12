"use client"

import * as React from "react"

import { siteConfig } from "@/config/site"
import {
  readBadgeNotice,
  readNotificationsUrl,
  readUnread,
  type ZapBadgeNotice,
  type ZapDiscussion,
} from "@/lib/zap"
import {
  clearRecent,
  readRecent,
  saveRecent,
  withCommentUpvote,
  withDeleted,
  withFlag,
  withPendingComment,
  withReaction,
  type Reaction,
  type ZapMine,
} from "@/lib/zap-local"

export type { Reaction, ZapMine }

/**
 * One post's discussion plus the visitor's part in it.
 *
 * Reading comes from zap.ms's public API, as before. Signing in, reacting and
 * commenting go to `/zap/*` on this site's own address, which zap.ms answers
 * (see zap's docs/architecture.md). When that path is not there, for example
 * in local development, `session` is "off" and callers fall back to links.
 *
 * A like, upvote or comment shows at once and is sent in the background; if
 * zap.ms refuses it the page goes back to what zap.ms last confirmed. That
 * confirmed view is also remembered for a few minutes (`zap-local.ts`), since
 * the public API's shared copy of a thread can lag behind the visitor's own
 * action.
 */

export type ZapSession =
  | { status: "checking" }
  | { status: "off" }
  | { status: "signed-out" }
  | {
      status: "signed-in"
      username: string
      /** Their photo on zap.ms, when they have one. */
      avatar: string | null
      /** Set while their Microsoft badge needs renewing or has been removed. */
      badgeNotice: ZapBadgeNotice | null
      /** Notifications they have not read, as of when the page loaded. */
      unread: number
      /** Their notifications page on zap.ms; null until zap.ms sends one. */
      notificationsUrl: string | null
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
type View = { thread: ZapDiscussion; mine: ZapMine }

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

  /** What zap.ms last confirmed, to fall back to when a write fails. */
  private confirmed: View | null = null
  private latestWrite = 0

  private view(): View | null {
    const { thread, mine } = this.state
    return thread.status === "ready" ? { thread: thread.data, mine } : null
  }

  private show(view: View) {
    this.set({
      thread: { status: "ready", data: view.thread },
      mine: view.mine,
    })
  }

  private start() {
    if (this.started) return
    this.started = true

    // Their own recent action first, so it is there before the network is.
    const recent = readRecent(localStorage, this.id, Date.now())
    if (recent) {
      this.confirmed = recent
      this.show(recent)
    }

    fetch(`${siteConfig.zap.url}/api/v1/mc/${this.id}`, { credentials: "omit" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: ZapDiscussion) => {
        // The shared copy may predate what this visitor just did, so it never
        // replaces a view zap.ms confirmed to them directly.
        if (this.confirmed) return
        this.confirmed = { thread: data, mine: this.state.mine }
        this.set({ thread: { status: "ready", data } })
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
    if (mine.ok && this.latestWrite === 0) {
      this.set({ mine: mine.data })
      if (this.confirmed)
        this.confirmed = { ...this.confirmed, mine: mine.data }
    }

    const pending = takePending()
    if (pending?.id === this.id && pending.react) {
      if (this.state.mine.reaction !== pending.react) this.react(pending.react)
    }
  }

  react(dir: Reaction) {
    const view = this.view()
    const next = view ? withReaction(view, dir) : null
    // Without a thread to work from, ask for the reaction outright.
    return this.write(
      "PUT",
      "/reaction",
      { dir: next ? next.mine.reaction : dir },
      next
    )
  }

  upvote(commentId: number) {
    const view = this.view()
    return this.write(
      "POST",
      `/comments/${commentId}/vote`,
      { dir: "up" },
      view ? withCommentUpvote(view, commentId) : null
    )
  }

  flag(commentId: number) {
    const view = this.view()
    return this.write(
      "POST",
      `/comments/${commentId}/flag`,
      {},
      view ? withFlag(view, commentId) : null
    )
  }

  remove(commentId: number) {
    const view = this.view()
    return this.write(
      "DELETE",
      `/comments/${commentId}`,
      {},
      view ? withDeleted(view, commentId) : null
    )
  }

  comment(
    text: string,
    parentId: number | null,
    author: { username: string; avatar: string | null }
  ) {
    const view = this.view()
    return this.write(
      "POST",
      "/comments",
      { text, parentId },
      view
        ? withPendingComment(
            view,
            {
              text,
              parentId,
              author: author.username,
              authorAvatar: author.avatar,
            },
            Date.now()
          )
        : null
    )
  }

  /**
   * Shows `optimistic` at once and sends the write. Presses can overlap, so
   * only the newest one decides what is on screen when the answers come in.
   */
  private async write(
    method: "PUT" | "POST" | "DELETE",
    path: string,
    body: unknown,
    optimistic: View | null
  ) {
    const mine = ++this.latestWrite
    this.set({ busy: true, error: null })
    if (optimistic) this.show(optimistic)

    const result = await call<WriteResult>(
      method,
      `/api/v1/mc/${this.id}${path}`,
      body
    )
    const isLatest = mine === this.latestWrite

    if (result.ok && result.data.thread) {
      this.confirmed = { thread: result.data.thread, mine: result.data.mine }
      saveRecent(localStorage, this.confirmed, Date.now())
      if (isLatest) {
        this.show(this.confirmed)
        this.set({ busy: false })
      }
      return true
    }

    const expired = !result.ok && result.status === 401
    if (expired) setSession({ status: "signed-out" })
    if (isLatest) {
      if (this.confirmed) this.show(this.confirmed)
      this.set({
        busy: false,
        error: expired
          ? "Your sign-in has expired. Sign in again to continue."
          : (!result.ok && result.message) || GENERIC_ERROR,
      })
    }
    return false
  }

  forget() {
    clearRecent(localStorage, this.id)
    this.set({ mine: NO_VOTES })
    if (this.confirmed) this.confirmed = { ...this.confirmed, mine: NO_VOTES }
  }
}

const sessionListeners = new Set<() => void>()

function setSession(next: ZapSession) {
  session = next
  stores.forEach((store) => store.set({ session }))
  sessionListeners.forEach((listener) => listener())
}

/**
 * Hides the notice that their badge was removed. zap.ms remembers it, so the
 * notice goes from zap.ms too; if zap.ms refuses, it comes back.
 */
async function dismissBadgeNotice() {
  if (session.status !== "signed-in" || !session.badgeNotice) return
  const { badgeNotice } = session
  setSession({ ...session, badgeNotice: null })
  const result = await call("POST", "/api/v1/me/badge-notice/dismiss")
  if (result.ok) return
  if (result.status === 401) return setSession({ status: "signed-out" })
  if (session.status === "signed-in") setSession({ ...session, badgeNotice })
}

async function signOut() {
  await call("POST", "/auth/signout", {})
  stores.forEach((store) => store.forget())
  setSession({ status: "signed-out" })
}

const subscribeSession = (listener: () => void) => {
  sessionListeners.add(listener)
  void loadSession()
  return () => sessionListeners.delete(listener)
}
const checking: ZapSession = { status: "checking" }

/** Who is signed in, for parts of the page outside a discussion. */
export function useZapSession() {
  const current = React.useSyncExternalStore(
    subscribeSession,
    () => session,
    () => checking
  )
  return {
    session: current,
    /** Comes back to the page they are on, not to a discussion. */
    signIn: () => signIn(null),
    signOut,
    dismissBadgeNotice,
  }
}

function loadSession(): Promise<void> {
  sessionRequest ??= call<{
    user: { username: string | null; avatar?: string | null } | null
    badgeNotice?: unknown
    unread?: unknown
    notificationsUrl?: unknown
  }>("GET", "/api/v1/me").then((result) => {
    if (!result.ok) return setSession({ status: "off" })
    const username = result.data.user?.username
    setSession(
      username
        ? {
            status: "signed-in",
            username,
            avatar: result.data.user?.avatar ?? null,
            badgeNotice: readBadgeNotice(result.data.badgeNotice),
            unread: readUnread(result.data.unread),
            notificationsUrl: readNotificationsUrl(
              result.data.notificationsUrl,
              process.env.NODE_ENV === "development"
            ),
          }
        : { status: "signed-out" }
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
    // zap.ms answers some writes with no body at all.
    if (response.status === 204) return { ok: true, data: undefined as T }
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

/**
 * Goes to zap.ms to sign in and comes back: to this post's discussion when
 * something there was pressed, otherwise to wherever they were.
 */
function signIn(pending: Pending | null) {
  if (pending) {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
    } catch {
      // Without storage they sign in and press the button again.
    }
  }
  const { pathname, search, hash } = window.location
  const here = `${pathname}${search}${pending ? "#discussion" : hash}`
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
        return current.react(dir)
      },
      comment: (text: string, parentId: number | null) =>
        current.comment(
          text,
          parentId,
          session.status === "signed-in"
            ? session
            : { username: "", avatar: null }
        ),
      upvote: (commentId: number) => current.upvote(commentId),
      flag: (commentId: number) => current.flag(commentId),
      remove: (commentId: number) => current.remove(commentId),
      signOut,
    }),
    [current, id]
  )

  return { ...state, ...actions }
}
