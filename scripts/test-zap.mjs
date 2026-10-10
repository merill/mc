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

const { sanitizeCommentHtml, buildThread, avatarColor, timeAgo, zapLinks } = await loadTypeScriptModule("../lib/zap.ts")

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
