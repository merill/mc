/**
 * Helpers for showing zap.ms discussions. The site only reads: every like,
 * dislike, reply and comment is a link to zap.ms. Kept free of imports so the
 * node test runner can load it directly.
 */

export type ZapComment = {
  id: number
  parentId: number | null
  depth: number
  author: string | null
  badges: string[]
  createdAt: string
  score: number
  html: string
  url: string
}

export type ZapDiscussion = {
  id: string
  url: string
  up: number
  down: number
  commentCount: number
  truncated: boolean
  comments: ZapComment[]
}

export type ZapActiveItem = {
  id: string
  title: string
  url: string
  up: number
  down: number
  commentCount: number
  lastActivityAt: string
  lastCommenter: string | null
}

export type ZapThreadNode = { comment: ZapComment; replies: ZapThreadNode[] }

/** Every place a visitor can go on zap.ms for one post. */
export function zapLinks(base: string, id: string) {
  const post = `${base}/mc/${id}`
  return {
    post,
    like: `${post}?react=up`,
    dislike: `${post}?react=down`,
    comment: `${post}#comment-form`,
    reply: (commentId: number) => `${post}?reply=${commentId}`,
    user: (username: string) => `${base}/user/${encodeURIComponent(username)}`,
    section: `${base}/s/message-center`,
  }
}

const ALLOWED_TAGS = new Set([
  "p",
  "a",
  "em",
  "strong",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "br",
])

const escapeText = (text: string) =>
  text.replace(/</g, "&lt;").replace(/>/g, "&gt;")

const escapeAttribute = (value: string) =>
  value.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/**
 * Second line of defence for comment HTML. zap.ms already renders comments to
 * a small set of tags; this rebuilds the markup so that only those tags can
 * come out, with no attributes except an http(s) `href` on links. Anything
 * else, including a tag we do not know, is shown as text.
 */
export function sanitizeCommentHtml(html: string): string {
  let out = ""
  let last = 0
  for (const match of html.matchAll(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g
  )) {
    const [whole, closing, rawName, attributes] = match
    out += escapeText(html.slice(last, match.index))
    last = (match.index ?? 0) + whole.length

    const name = rawName.toLowerCase()
    if (!ALLOWED_TAGS.has(name)) {
      out += escapeText(whole)
    } else if (closing) {
      out += name === "br" ? "" : `</${name}>`
    } else if (name === "a") {
      const href = /\bhref="(https?:\/\/[^"\s]*)"/i.exec(attributes)?.[1]
      // A link we cannot trust keeps its text but goes nowhere.
      out += href
        ? `<a href="${escapeAttribute(
            href
          )}" rel="ugc nofollow noopener noreferrer" target="_blank">`
        : "<a>"
    } else {
      out += `<${name}>`
    }
  }
  return out + escapeText(html.slice(last))
}

/**
 * Turns the API's flat, display-ordered list into a tree. Replies deeper than
 * `maxDepth` stay visible but stop indenting, so a long exchange does not
 * squeeze the text off a phone screen.
 */
export function buildThread(
  comments: ZapComment[],
  maxDepth = 4
): ZapThreadNode[] {
  const roots: ZapThreadNode[] = []
  const nodes = new Map<number, { node: ZapThreadNode; depth: number }>()
  for (const comment of comments) {
    const node: ZapThreadNode = { comment, replies: [] }
    let parent =
      comment.parentId === null ? undefined : nodes.get(comment.parentId)
    // Walk up until the reply fits inside the depth cap.
    while (parent && parent.depth >= maxDepth) {
      const grandparentId = parent.node.comment.parentId
      parent = grandparentId === null ? undefined : nodes.get(grandparentId)
    }
    if (parent) {
      parent.node.replies.push(node)
      nodes.set(comment.id, { node, depth: parent.depth + 1 })
    } else {
      roots.push(node)
      nodes.set(comment.id, { node, depth: 0 })
    }
  }
  return roots
}

// Same palette and hash as zap.ms, so a person looks the same on both sites.
const AVATAR_COLORS = [
  "#2563eb",
  "#0f766e",
  "#7c3aed",
  "#b45309",
  "#be123c",
  "#0369a1",
  "#4d7c0f",
  "#9333ea",
]

export function avatarColor(username: string): string {
  let hash = 0
  for (const char of username) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000))
  if (!Number.isFinite(seconds)) return ""
  if (seconds < 60) return "just now"
  const plural = (value: number, unit: string) =>
    `${value} ${unit}${value === 1 ? "" : "s"} ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return plural(minutes, "minute")
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return plural(hours, "hour")
  return plural(Math.floor(hours / 24), "day")
}

export const BADGE_LABELS: Record<string, string> = {
  microsoft: "Microsoft",
  mvp: "MVP",
  "mvp-rd": "MVP RD",
}
