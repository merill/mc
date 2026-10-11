/**
 * What the visitor's own browser remembers about zap.ms discussions, so the
 * page can show their action before zap.ms confirms it, keep showing it while
 * shared copies of the thread catch up, and keep an unsent comment safe.
 * Kept free of runtime imports so the node test runner can load it directly.
 */
import type { ZapComment, ZapCounts, ZapDiscussion } from "./zap"

export type Reaction = "up" | "down"

export type ZapMine = {
  reaction: Reaction | null
  commentVotes: Record<string, Reaction>
  /** Comments the visitor flagged. Absent until zap.ms reports it. */
  flagged?: number[]
  /** Their own comments zap.ms still lets them delete. */
  deletable?: number[]
}

type View = { thread: ZapDiscussion; mine: ZapMine }
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

// zap.ms's shared copy of a thread is at most five minutes old.
export const RECENT_TTL_MS = 5 * 60 * 1000
// Its counts for lists are at most ten, so lists look back that far.
export const COUNTS_TTL_MS = 10 * 60 * 1000
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

const RECENT_PREFIX = "zap-recent:"
const DRAFT_PREFIX = "zap-draft:"

// --- Showing an action before it is confirmed ------------------------------

/** The view after pressing like or dislike; the same one again takes it back. */
export function withReaction(view: View, dir: Reaction): View {
  const before = view.mine.reaction
  const after = before === dir ? null : dir
  const change = (side: Reaction) =>
    (after === side ? 1 : 0) - (before === side ? 1 : 0)
  return {
    thread: {
      ...view.thread,
      up: Math.max(0, view.thread.up + change("up")),
      down: Math.max(0, view.thread.down + change("down")),
    },
    mine: { ...view.mine, reaction: after },
  }
}

/** The view after pressing a comment's upvote; pressing again takes it back. */
export function withCommentUpvote(view: View, commentId: number): View {
  const had = view.mine.commentVotes[commentId] === "up"
  const commentVotes = { ...view.mine.commentVotes }
  if (had) delete commentVotes[commentId]
  else commentVotes[commentId] = "up"
  return {
    thread: {
      ...view.thread,
      comments: view.thread.comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, score: comment.score + (had ? -1 : 1) }
          : comment
      ),
    },
    mine: { ...view.mine, commentVotes },
  }
}

/** The view after flagging a comment. */
export function withFlag(view: View, commentId: number): View {
  const flagged = view.mine.flagged ?? []
  if (flagged.includes(commentId)) return view
  return { ...view, mine: { ...view.mine, flagged: [...flagged, commentId] } }
}

/** The view after deleting your own comment: zap.ms shows it as removed. */
export function withDeleted(view: View, commentId: number): View {
  return {
    thread: {
      ...view.thread,
      comments: view.thread.comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, author: null, badges: [], html: "<p>[removed]</p>" }
          : comment
      ),
    },
    mine: {
      ...view.mine,
      deletable: (view.mine.deletable ?? []).filter((id) => id !== commentId),
    },
  }
}

/** The view with a comment that is still on its way to zap.ms. */
export function withPendingComment(
  view: View,
  draft: {
    text: string
    parentId: number | null
    author: string
    authorAvatar?: string | null
  },
  now: number
): View {
  const comments = view.thread.comments
  const parentAt = comments.findIndex((c) => c.id === draft.parentId)
  const parent = parentAt === -1 ? null : comments[parentAt]
  const pending: ZapComment = {
    // Negative, so it can never collide with a real comment.
    id: -now,
    parentId: parent ? parent.id : null,
    depth: parent ? parent.depth + 1 : 0,
    author: draft.author,
    authorAvatar: draft.authorAvatar ?? null,
    badges: [],
    createdAt: new Date(now).toISOString(),
    score: 1,
    html: plainTextHtml(draft.text),
    url: "",
    pending: true,
  }
  // A reply goes after its parent's existing replies; a comment goes last.
  let at = comments.length
  if (parent) {
    at = parentAt + 1
    while (at < comments.length && comments[at].depth > parent.depth) at++
  }
  return {
    thread: {
      ...view.thread,
      commentCount: view.thread.commentCount + 1,
      comments: [...comments.slice(0, at), pending, ...comments.slice(at)],
    },
    mine: view.mine,
  }
}

/** Typed text as safe HTML. zap.ms renders the Markdown once it has it. */
export function plainTextHtml(text: string): string {
  const escaped = text
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("\n")
}

// --- Remembering what zap.ms last confirmed --------------------------------

/** Keeps the thread zap.ms returned for a write, for a few minutes. */
export function saveRecent(store: Store, view: View, now: number): void {
  write(store, RECENT_PREFIX + view.thread.id, { at: now, ...view })
}

/**
 * The remembered view of a post, or null once it is older than `maxAge`. It
 * stays in the store for as long as lists can still use it.
 */
export function readRecent(
  store: Store,
  id: string,
  now: number,
  maxAge = RECENT_TTL_MS
): View | null {
  const saved = read<View & { at: number }>(store, RECENT_PREFIX + id)
  if (!saved) return null
  const age = now - saved.at
  if (age > COUNTS_TTL_MS) store.removeItem(RECENT_PREFIX + id)
  if (age > maxAge) return null
  return { thread: saved.thread, mine: saved.mine }
}

export function clearRecent(store: Store, id: string): void {
  store.removeItem(RECENT_PREFIX + id)
}

/** A post's counts as the visitor's own recent action left them, if any. */
export function recentCounts(
  store: Store,
  id: string,
  now: number
): ZapCounts | null {
  const recent = readRecent(store, id, now, COUNTS_TTL_MS)
  if (!recent) return null
  const { up, down, commentCount } = recent.thread
  return { up, down, commentCount }
}

/** A list from zap.ms with the visitor's own recent changes laid over it. */
export function overlayRecent<T extends ZapCounts & { id: string }>(
  items: T[],
  store: Store,
  now: number
): T[] {
  return items.map((item) => {
    const recent = recentCounts(store, item.id, now)
    return recent ? { ...item, ...recent } : item
  })
}

// --- Unsent comments --------------------------------------------------------

export const draftKey = (postId: string, parentId: number | null) =>
  `${DRAFT_PREFIX}${postId}:${parentId ?? "new"}`

export function saveDraft(
  store: Store,
  key: string,
  text: string,
  now: number
): void {
  if (text.trim()) write(store, key, { at: now, text })
  else store.removeItem(key)
}

export function readDraft(store: Store, key: string, now: number): string {
  const saved = read<{ at: number; text: string }>(store, key)
  if (!saved) return ""
  if (now - saved.at > DRAFT_TTL_MS) {
    store.removeItem(key)
    return ""
  }
  return saved.text
}

function read<T>(store: Store, key: string): T | null {
  try {
    const raw = store.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(store: Store, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    // Storage is full or blocked: the page works, it just forgets sooner.
  }
}
