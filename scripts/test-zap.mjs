import assert from "node:assert/strict"
import fs from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

// Use the project's compiler so these tests also run on Node 20.
async function loadTypeScriptModule(relativePath) {
  const source = await fs.readFile(new URL(relativePath, import.meta.url), "utf8")
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`)
}

const { sanitizeCommentHtml, buildThread, avatarColor, avatarSrc, timeAgo, zapLinks, countsPath, countsBatches, COUNTS_BATCH } = await loadTypeScriptModule("../lib/zap.ts")

const LINK = 'rel="ugc nofollow noopener noreferrer" target="_blank"'

test("keeps the tags zap.ms produces", () => {
  const html = "<p>One <strong>two</strong> <em>three</em> <code>four</code><br>five</p>\n<pre><code>x &lt; y</code></pre>\n<blockquote><p>q</p></blockquote>\n<ul><li>a</li></ul><ol><li>b</li></ol>"
  assert.equal(sanitizeCommentHtml(html), html)
})

test("keeps http(s) links, replaces their attributes", () => {
  assert.equal(
    sanitizeCommentHtml('<a href="https://example.com/a?b=1&amp;c=2" rel="ugc nofollow noopener">link</a>'),
    `<a href="https://example.com/a?b=1&amp;c=2" ${LINK}>link</a>`
  )
})

test("drops unsafe link targets and every other attribute", () => {
  for (const anchor of [
    '<a href="javascript:alert(1)">x</a>',
    '<a href="data:text/html,x">x</a>',
    "<a href='https://example.com'>x</a>",
    '<a onclick="alert(1)">x</a>',
    '<a href="//example.com">x</a>'
  ]) {
    assert.equal(sanitizeCommentHtml(anchor), "<a>x</a>", anchor)
  }
  assert.equal(sanitizeCommentHtml('<p onclick="alert(1)" class="x" style="color:red">t</p>'), "<p>t</p>")
  assert.equal(
    sanitizeCommentHtml('<a href="https://example.com" onmouseover="alert(1)" style="x">t</a>'),
    `<a href="https://example.com" ${LINK}>t</a>`
  )
})

test("shows unknown tags as text", () => {
  assert.equal(sanitizeCommentHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;")
  assert.equal(sanitizeCommentHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror="alert(1)"&gt;')
  assert.equal(sanitizeCommentHtml("<iframe src='https://x'></iframe>"), "&lt;iframe src='https://x'&gt;&lt;/iframe&gt;")
  assert.equal(sanitizeCommentHtml("<svg/onload=alert(1)>"), "&lt;svg/onload=alert(1)&gt;")
  assert.equal(sanitizeCommentHtml("<P>shout</P>"), "<p>shout</p>")
})

test("never lets a stray angle bracket through", () => {
  const hostile = [
    "<<script>script>alert(1)<</script>/script>",
    "<p <script>alert(1)</script>>",
    '<a href="https://example.com/"><script>alert(1)</script>">x</a>',
    "<scr<p>ipt>alert(1)</scr</p>ipt>",
    "text < not a tag > more",
    '<a href="https://example.com/x"onmouseover="alert(1)">x</a>',
    "<p\n<img src=x onerror=alert(1)>>"
  ]
  const known = /<\/?(?:p|em|strong|code|pre|blockquote|ul|ol|li|br)>|<a(?: href="https?:\/\/[^"<>\s]*" rel="ugc nofollow noopener noreferrer" target="_blank")?>|<\/a>/g
  for (const input of hostile) {
    const output = sanitizeCommentHtml(input)
    assert.doesNotMatch(output.replace(known, ""), /[<>]/, `${input} -> ${output}`)
  }
})

const comment = (id, parentId, depth) => ({ id, parentId, depth, author: "a", badges: [], createdAt: "2026-10-01T00:00:00Z", score: 0, html: "", url: "" })

test("builds a tree from the flat display order", () => {
  const tree = buildThread([comment(1, null, 0), comment(2, 1, 1), comment(3, 2, 2), comment(4, null, 0), comment(5, 4, 1)])
  assert.deepEqual(tree.map(node => node.comment.id), [1, 4])
  assert.equal(tree[0].replies[0].comment.id, 2)
  assert.equal(tree[0].replies[0].replies[0].comment.id, 3)
  assert.equal(tree[1].replies[0].comment.id, 5)
})

test("stops indenting past the depth cap but keeps every comment", () => {
  const chain = Array.from({ length: 8 }, (_, index) => comment(index + 1, index === 0 ? null : index, index))
  const tree = buildThread(chain, 4)
  // Comments 6, 7 and 8 sit beside 5, at the capped depth.
  const parentOfFive = tree[0].replies[0].replies[0].replies[0]
  assert.deepEqual(parentOfFive.replies.map(reply => reply.comment.id), [5, 6, 7, 8])
})

test("treats a reply whose parent is missing as top level", () => {
  assert.deepEqual(buildThread([comment(9, 1234, 3)]).map(node => node.comment.id), [9])
})

test("avatar colours match zap.ms", () => {
  assert.equal(avatarColor("demo"), "#b45309")
  assert.equal(avatarColor("messagecenter"), avatarColor("messagecenter"))
  assert.match(avatarColor(""), /^#[0-9a-f]{6}$/)
})

test("only a plain https address is used as a photo", () => {
  assert.equal(avatarSrc("https://img.zap.ms/a/abc.webp"), "https://img.zap.ms/a/abc.webp")
  for (const bad of [null, undefined, "", "/avatar/a/abc.webp", "http://img.zap.ms/a.webp", "javascript:alert(1)", 'https://x/" onerror="y']) {
    assert.equal(avatarSrc(bad), null)
  }
})

test("formats ages", () => {
  const now = Date.parse("2026-10-10T12:00:00Z")
  assert.equal(timeAgo("2026-10-10T11:59:30Z", now), "just now")
  assert.equal(timeAgo("2026-10-10T11:59:00Z", now), "1 minute ago")
  assert.equal(timeAgo("2026-10-10T09:00:00Z", now), "3 hours ago")
  assert.equal(timeAgo("2026-10-07T12:00:00Z", now), "3 days ago")
  assert.equal(timeAgo("not a date", now), "")
})

test("builds zap.ms links", () => {
  const links = zapLinks("https://zap.ms", "MC1474104")
  assert.equal(links.like, "https://zap.ms/mc/MC1474104?react=up")
  assert.equal(links.dislike, "https://zap.ms/mc/MC1474104?react=down")
  assert.equal(links.comment, "https://zap.ms/mc/MC1474104#comment-form")
  assert.equal(links.reply(42), "https://zap.ms/mc/MC1474104?reply=42")
  assert.equal(links.user("a b"), "https://zap.ms/user/a%20b")
})

const local = await loadTypeScriptModule("../lib/zap-local.ts")

function memoryStore() {
  const items = new Map()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: (key) => items.delete(key),
    size: () => items.size
  }
}

const localComment = (id, parentId, depth) => ({
  id, parentId, depth, author: "ann", badges: [], createdAt: "2026-10-11T00:00:00Z", score: 1, html: "<p>x</p>", url: ""
})
const localView = (overrides = {}) => ({
  thread: { id: "MC1", url: "", up: 3, down: 1, commentCount: 0, truncated: false, comments: [], ...overrides },
  mine: { reaction: null, commentVotes: {} }
})

test("a like shows at once, switches sides and can be taken back", () => {
  const liked = local.withReaction(localView(), "up")
  assert.deepEqual([liked.thread.up, liked.thread.down, liked.mine.reaction], [4, 1, "up"])
  const disliked = local.withReaction(liked, "down")
  assert.deepEqual([disliked.thread.up, disliked.thread.down, disliked.mine.reaction], [3, 2, "down"])
  const cleared = local.withReaction(disliked, "down")
  assert.deepEqual([cleared.thread.up, cleared.thread.down, cleared.mine.reaction], [3, 1, null])
})

test("a comment upvote shows at once and can be taken back", () => {
  const start = localView({ comments: [localComment(7, null, 0)] })
  const voted = local.withCommentUpvote(start, 7)
  assert.equal(voted.thread.comments[0].score, 2)
  assert.deepEqual(voted.mine.commentVotes, { 7: "up" })
  const back = local.withCommentUpvote(voted, 7)
  assert.equal(back.thread.comments[0].score, 1)
  assert.deepEqual(back.mine.commentVotes, {})
})

test("a comment like moves the like count too, when zap.ms sends one", () => {
  const start = localView({ comments: [{ ...localComment(7, null, 0), score: -1, likes: 2 }] })
  const liked = local.withCommentUpvote(start, 7)
  assert.deepEqual([liked.thread.comments[0].score, liked.thread.comments[0].likes], [0, 3])
  const back = local.withCommentUpvote(liked, 7)
  assert.deepEqual([back.thread.comments[0].score, back.thread.comments[0].likes], [-1, 2])
  // A count that is already 0 stays there, and a comment without one gains none.
  const stale = { ...localView({ comments: [{ ...localComment(7, null, 0), likes: 0 }] }), mine: { reaction: null, commentVotes: { 7: "up" } } }
  assert.equal(local.withCommentUpvote(stale, 7).thread.comments[0].likes, 0)
  assert.equal("likes" in local.withCommentUpvote(localView({ comments: [localComment(7, null, 0)] }), 7).thread.comments[0], false)
})

test("a pending reply sits under its parent, after the replies already there", () => {
  const start = localView({ commentCount: 3, comments: [localComment(1, null, 0), localComment(2, 1, 1), localComment(3, null, 0)] })
  const replied = local.withPendingComment(start, { text: "hi", parentId: 1, author: "bob" }, 1000)
  assert.deepEqual(replied.thread.comments.map((c) => c.id), [1, 2, -1000, 3])
  assert.equal(replied.thread.comments[2].depth, 1)
  assert.equal(replied.thread.comments[2].pending, true)
  assert.equal(replied.thread.commentCount, 4)
  const top = local.withPendingComment(start, { text: "hi", parentId: null, author: "bob", authorAvatar: "https://img.zap.ms/a/bob.webp" }, 1000)
  assert.deepEqual(top.thread.comments.map((c) => c.id), [1, 2, 3, -1000])
})

test("typed text is shown as text, never as markup", () => {
  assert.equal(local.plainTextHtml("a <b>&\nb\n\nc"), "<p>a &lt;b&gt;&amp;<br>b</p>\n<p>c</p>")
})

test("a confirmed view is remembered for five minutes, and for ten by lists", () => {
  const store = memoryStore()
  const confirmed = local.withReaction(localView({ commentCount: 2 }), "up")
  local.saveRecent(store, confirmed, 1000)
  assert.deepEqual(local.readRecent(store, "MC1", 2000), confirmed)
  const list = [{ id: "MC1", up: 3, down: 1, commentCount: 1 }, { id: "MC2", up: 9, down: 0, commentCount: 5 }]
  const overlaid = [
    { id: "MC1", up: 4, down: 1, commentCount: 2 },
    { id: "MC2", up: 9, down: 0, commentCount: 5 }
  ]
  assert.deepEqual(local.overlayRecent(list, store, 2000), overlaid)

  // Past five minutes the thread is read fresh, while lists still trail.
  const later = 1000 + local.RECENT_TTL_MS + 1
  assert.equal(local.readRecent(store, "MC1", later), null)
  assert.deepEqual(local.recentCounts(store, "MC1", later), { up: 4, down: 1, commentCount: 2 })
  assert.deepEqual(local.overlayRecent(list, store, later), overlaid)
  assert.equal(local.recentCounts(store, "MC2", later), null)

  const expired = 1000 + local.COUNTS_TTL_MS + 1
  assert.deepEqual(local.overlayRecent(list, store, expired), list)
  assert.equal(store.size(), 0)
})

test("the same posts in any order ask zap.ms for one address", () => {
  assert.equal(countsPath(["MC200", "RM3", "MC100", "MC200"]), "/mc/counts?ids=MC100,MC200,RM3")
  assert.equal(zapLinks("https://zap.ms", "MC1").local, "/message/MC1#discussion")
})

test("counts are asked for in batches that fit a request and an address", () => {
  assert.deepEqual(countsBatches([]), [])
  assert.deepEqual(countsBatches(["MC1", "RM2"]), [["MC1", "RM2"]])

  const many = Array.from({ length: COUNTS_BATCH * 2 + 5 }, (_, index) => `MC${index}`)
  assert.deepEqual(countsBatches(many).map(batch => batch.length), [COUNTS_BATCH, COUNTS_BATCH, 5])

  // Older Azure updates have long ids; no address may grow past a few thousand characters.
  const slugs = Array.from({ length: 120 }, (_, index) => `AZ-${"long-slug-".repeat(15)}${index}`)
  const batches = countsBatches(slugs)
  assert.ok(batches.length > 1)
  assert.deepEqual(batches.flat(), slugs)
  for (const batch of batches) assert.ok(countsPath(batch).length < 4100, String(countsPath(batch).length))
})

test("a draft is kept per box, expires after a week and goes when emptied", () => {
  const store = memoryStore()
  const key = local.draftKey("MC1", null)
  assert.notEqual(key, local.draftKey("MC1", 5))
  local.saveDraft(store, key, "half a thought", 1000)
  assert.equal(local.readDraft(store, key, 2000), "half a thought")
  assert.equal(local.readDraft(store, key, 1000 + local.DRAFT_TTL_MS + 1), "")
  local.saveDraft(store, key, "again", 1000)
  local.saveDraft(store, key, "   ", 1001)
  assert.equal(store.size(), 0)
})

test("flagging marks the comment once; deleting shows it as removed", () => {
  const start = localView({ comments: [localComment(7, null, 0)] })
  const flagged = local.withFlag(local.withFlag(start, 7), 7)
  assert.deepEqual(flagged.mine.flagged, [7])

  const mine = { ...start, mine: { ...start.mine, deletable: [7, 9] } }
  const deleted = local.withDeleted(mine, 7)
  assert.equal(deleted.thread.comments[0].html, "<p>[removed]</p>")
  assert.equal(deleted.thread.comments[0].author, null)
  assert.deepEqual(deleted.mine.deletable, [9])
})

const { readBadgeNotice, badgeNoticeText } = await loadTypeScriptModule("../lib/zap.ts")
const notice = (over = {}) => ({ kind: "microsoft", state: "renew", deadline: 1799496000, verifyUrl: "https://zap.ms/settings/verify", ...over })

test("reads a badge notice, and nothing from an answer it cannot show", () => {
  assert.deepEqual(readBadgeNotice(notice()), notice())
  assert.deepEqual(readBadgeNotice(notice({ state: "removed" })), notice({ state: "removed" }))
  for (const raw of [
    undefined,
    null,
    "renew",
    notice({ kind: "mvp" }),
    notice({ state: "expired" }),
    notice({ deadline: "1799496000" }),
    notice({ verifyUrl: "javascript:alert(1)" }),
    notice({ verifyUrl: undefined })
  ]) {
    assert.equal(readBadgeNotice(raw), null, JSON.stringify(raw))
  }
})

test("words the badge notice with the date in the visitor's locale", () => {
  // Midday UTC, so the day is the same in every time zone the tests run in.
  assert.equal(badgeNoticeText(notice(), "en-US"), "Confirm your Microsoft email by January 9, 2027 to keep your Microsoft badge.")
  assert.equal(badgeNoticeText(notice(), "en-GB"), "Confirm your Microsoft email by 9 January 2027 to keep your Microsoft badge.")
  assert.equal(
    badgeNoticeText(notice({ state: "removed" }), "en-US"),
    "Your Microsoft badge was removed because your Microsoft email was not confirmed again."
  )
})

const { commentLikes, readUnread, readNotificationsUrl, unreadBadge } = await loadTypeScriptModule("../lib/zap.ts")

test("a comment shows its likes, or its score until zap.ms sends them", () => {
  assert.equal(commentLikes({ score: -2, likes: 3 }), 3)
  assert.equal(commentLikes({ score: 4, likes: 0 }), 0)
  assert.equal(commentLikes({ score: 4 }), 4)
  assert.equal(commentLikes({ score: -2 }), 0)
})

test("reads the unread count, and 0 from anything that is not one", () => {
  assert.equal(readUnread(3), 3)
  assert.equal(readUnread(0), 0)
  for (const raw of [undefined, null, "3", -1, NaN, Infinity, {}]) {
    assert.equal(readUnread(raw), 0, String(raw))
  }
})

test("links only to an https notifications page, or to localhost in development", () => {
  assert.equal(readNotificationsUrl("https://zap.ms/notifications"), "https://zap.ms/notifications")
  assert.equal(readNotificationsUrl("http://localhost:8787/notifications", true), "http://localhost:8787/notifications")
  assert.equal(readNotificationsUrl("http://localhost/notifications", true), "http://localhost/notifications")
  for (const raw of [undefined, null, 7, "", "/notifications", "//zap.ms/notifications", "http://zap.ms/notifications", "javascript:alert(1)", " https://zap.ms"]) {
    assert.equal(readNotificationsUrl(raw, true), null, String(raw))
  }
  assert.equal(readNotificationsUrl("http://localhost:8787/notifications"), null)
  assert.equal(readNotificationsUrl("http://localhost.evil.example/notifications", true), null)
  assert.equal(readNotificationsUrl("http://localhost@evil.example/", true), null)
})

test("the bell shows at most 9+ and says the real count aloud", () => {
  assert.deepEqual(unreadBadge(0), { text: "0", label: "Notifications" })
  assert.deepEqual(unreadBadge(9), { text: "9", label: "Notifications, 9 unread" })
  assert.deepEqual(unreadBadge(12), { text: "9+", label: "Notifications, 12 unread" })
})
