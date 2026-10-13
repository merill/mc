import assert from "node:assert/strict"
import test from "node:test"

import {
  PAGE_SIZE,
  RECENT_DAYS,
  byNewest,
  fetchSince,
  fetchUpdates,
  isRecent,
  mergeUpdates,
  sanitizeHtml,
  toAzureId,
  toIndexRecord,
  toMessage,
  toPlainText,
  toSourceId
} from "./update-azure.mjs"

const update = (overrides = {}) => ({
  id: "574430",
  productCategories: ["Compute", "Containers"],
  tags: ["Features"],
  products: ["Azure Kubernetes Service (AKS)", "Azure NAT Gateway"],
  generalAvailabilityDate: "2026-10",
  title: " Generally Available: Managed StandardV2 NAT Gateway for AKS ",
  description: '<p>AKS will now provision a gateway.</p><a href="https://learn.microsoft.com/aks">Learn more</a>.<br>',
  status: "Launched",
  created: "2026-10-08T22:51:01.6329557Z",
  modified: "2026-10-09T10:00:00.1234567Z",
  locale: null,
  availabilities: [{ ring: "General Availability", year: 2026, month: "October" }],
  ...overrides
})

const page = items => ({ ok: true, status: 200, json: async () => ({ value: items }) })
const noSleep = async () => {}

test("numbers keep Microsoft's id after AZ; older updates keep their slug", () => {
  assert.equal(toAzureId("574430"), "AZ574430")
  assert.equal(toAzureId("general-availability-traffic-manager"), "AZ-general-availability-traffic-manager")
  for (const id of ["AZ574430", "AZ-general-availability-traffic-manager"]) {
    assert.equal(toAzureId(toSourceId(id)), id)
  }
  for (const bad of ["", null, "Has Spaces", "UPPER", "a/b", "../x", "a".repeat(201)]) {
    assert.equal(toAzureId(bad), null, String(bad))
  }
})

test("maps an update to the shape the site uses for a post", () => {
  const message = toMessage(update())
  assert.equal(message.Id, "AZ574430")
  assert.equal(message.Title, "Generally Available: Managed StandardV2 NAT Gateway for AKS")
  assert.equal(message.Source, "azure")
  assert.equal(message.StartDateTime, "2026-10-08T22:51:01.632Z")
  assert.equal(message.LastModifiedDateTime, "2026-10-09T10:00:00.123Z")
  assert.deepEqual(message.Services, ["Azure Kubernetes Service (AKS)", "Azure NAT Gateway"])
  assert.deepEqual(message.Tags, ["Features"])
  assert.deepEqual(message.Details, [
    { Name: "SourceId", Value: "574430" },
    { Name: "AzureLink", Value: "https://azure.microsoft.com/updates?id=574430" },
    { Name: "Status", Value: "Launched" },
    { Name: "ReleasePhase", Value: "General Availability" },
    { Name: "Availability", Value: "General Availability: October 2026" },
    { Name: "ProductCategories", Value: "Compute, Containers" }
  ])
  assert.equal(message.Body.Markdown, "AKS will now provision a gateway.\n\nLearn more .")
})

test("leaves out details Microsoft did not give", () => {
  const message = toMessage(update({ status: null, availabilities: [], productCategories: [], products: [] }))
  assert.deepEqual(message.Details.map(detail => detail.Name), ["SourceId", "AzureLink"])
  assert.deepEqual(message.Services, [])
})

test("lists every availability, once", () => {
  const message = toMessage(
    update({
      availabilities: [
        { ring: "Preview", year: 2026, month: "May" },
        { ring: "Retirement", year: 2027, month: "October" },
        { ring: "Preview", year: 2026, month: "May" }
      ]
    })
  )
  const detail = name => message.Details.find(item => item.Name === name).Value
  assert.equal(detail("ReleasePhase"), "Preview, Retirement")
  assert.equal(detail("Availability"), "Preview: May 2026; Retirement: October 2027")
})

test("skips an update with no usable id, title or date", () => {
  assert.equal(toMessage(update({ id: "Not A Slug" })), null)
  assert.equal(toMessage(update({ title: "   " })), null)
  assert.equal(toMessage(update({ created: "soon" })), null)
  assert.equal(toMessage(null), null)
  // A missing change date falls back to when it was published.
  assert.equal(toMessage(update({ modified: null })).LastModifiedDateTime, "2026-10-08T22:51:01.632Z")
})

test("keeps ordinary markup and links", () => {
  const html = '<p>One <strong>two</strong> <em>three</em></p><ul><li>a</li></ul><table><tr><td colspan="2">x</td></tr></table>'
  assert.equal(sanitizeHtml(html), html)
  assert.equal(
    sanitizeHtml('<a href="https://learn.microsoft.com/x?a=1&amp;b=2" class="btn">Docs</a>'),
    '<a href="https://learn.microsoft.com/x?a=1&amp;b=2" target="_blank" rel="noopener">Docs</a>'
  )
  assert.equal(
    sanitizeHtml('<img src="//cdn.example.com/a.png" alt="A" width="10" onerror="x()">'),
    '<img src="https://cdn.example.com/a.png" alt="A">'
  )
})

test("removes scripts, styles and anything else that brings behaviour", () => {
  assert.equal(sanitizeHtml('<p>a</p><script>alert(1)</script><p>b</p>'), "<p>a</p><p>b</p>")
  assert.equal(sanitizeHtml('<style type="text/css">p { color: red }</style><p>a</p>'), "<p>a</p>")
  assert.equal(sanitizeHtml('<iframe src="https://x"></iframe><svg><path d="M0"/><svg></svg></svg>ok'), "ok")
  assert.equal(sanitizeHtml('<p onclick="x()" style="color:black" class="c">a</p>'), "<p>a</p>")
  assert.equal(sanitizeHtml("<!--[if gte mso 9]><xml>x</xml><![endif]--><p>a</p>"), "<p>a</p>")
  // An element left open takes the rest of the description with it.
  assert.equal(sanitizeHtml("<p>a</p><script>alert(1)"), "<p>a</p>")
})

test("drops links and images that do not go to the web", () => {
  for (const href of ["javascript:alert(1)", "data:text/html,x", "vbscript:x", " JaVaScRiPt:alert(1)"]) {
    assert.equal(sanitizeHtml(`<a href="${href}">x</a>`), "<a>x</a>", href)
  }
  assert.equal(sanitizeHtml('<img src="data:image/png;base64,AAAA">'), "<img>")
  assert.equal(sanitizeHtml("<a href=javascript:alert(1)>x</a>"), "<a>x</a>")
  assert.equal(
    sanitizeHtml('<a href="/pricing/details/">Pricing</a>'),
    '<a href="https://azure.microsoft.com/pricing/details/" target="_blank" rel="noopener">Pricing</a>'
  )
  assert.equal(sanitizeHtml('<a href="mailto:a@example.com">Mail</a>'), '<a href="mailto:a@example.com" target="_blank" rel="noopener">Mail</a>')
})

test("unwraps tags it does not keep, and the ones that would read as a comparison", () => {
  assert.equal(sanitizeHtml('<font color="red">a</font> <o:p>b</o:p> <nav>c</nav>'), "a b c")
  assert.equal(sanitizeHtml("<ins>added</ins> <del>gone</del>"), "added <s>gone</s>")
  assert.equal(sanitizeHtml("<h1>Title</h1>"), "<h2>Title</h2>")
  assert.equal(sanitizeHtml(null), "")
})

test("turns a description into paragraphs of plain text", () => {
  assert.equal(
    toPlainText("<p>Azure&nbsp;SQL &amp; friends&rsquo; update&#33;</p><ul><li>One</li><li>Two &#x2014; three</li></ul>"),
    "Azure SQL & friends’ update!\n\nOne\n\nTwo — three"
  )
  assert.equal(toPlainText("a &unknown; b"), "a &unknown; b")
  assert.equal(toPlainText(null), "")
})

test("writes the index record other tools read", () => {
  const record = toIndexRecord(toMessage(update({ description: `<p>${"word ".repeat(200)}</p>` })))
  assert.deepEqual(Object.keys(record), [
    "Id", "Title", "Source", "Url", "Services", "StartDateTime", "EndDateTime",
    "LastModifiedDateTime", "IsMajorChange", "Category", "Tags", "Summary"
  ])
  assert.equal(record.Url, "https://mc.merill.net/message/AZ574430")
  assert.equal(record.Source, "azure")
  assert.equal(record.Summary.length, 502)
  assert.ok(record.Summary.endsWith("word..."))
})

test("orders newest change first and knows what is recent", () => {
  const now = Date.parse("2026-10-13T00:00:00Z")
  const a = toMessage(update({ id: "1", modified: "2026-10-01T00:00:00Z" }))
  const b = toMessage(update({ id: "2", modified: "2026-10-05T00:00:00Z" }))
  const c = toMessage(update({ id: "3", modified: "2026-10-05T00:00:00Z" }))
  const old = toMessage(update({ id: "old-one", created: "2020-01-01T00:00:00Z", modified: "2020-01-01T00:00:00Z" }))
  assert.deepEqual([a, old, c, b].sort(byNewest).map(message => message.Id), ["AZ2", "AZ3", "AZ1", "AZ-old-one"])
  assert.equal(isRecent(a, now), true)
  assert.equal(isRecent(old, now), false)
  assert.equal(RECENT_DAYS, 365)
})

test("asks for changes since a week before the newest stored one", () => {
  assert.equal(fetchSince([]), null)
  const stored = [toMessage(update({ modified: "2026-10-09T10:00:00Z" })), toMessage(update({ id: "1", modified: "2026-09-01T00:00:00Z" }))]
  assert.equal(fetchSince(stored), "2026-10-02T10:00:00.000Z")
})

test("reads every page of a full fetch, oldest first", async () => {
  const urls = []
  const fetchImpl = async url => {
    urls.push(new URL(url))
    const skip = Number(new URL(url).searchParams.get("$skip"))
    return page(Array.from({ length: skip < 200 ? PAGE_SIZE : 7 }, (_, index) => update({ id: String(skip + index + 1) })))
  }
  const updates = await fetchUpdates({ fetchImpl, sleep: noSleep })
  assert.equal(updates.length, 207)
  assert.deepEqual(urls.map(url => url.searchParams.get("$skip")), ["0", "100", "200"])
  assert.equal(urls[0].searchParams.get("$orderby"), "created asc")
  assert.equal(urls[0].searchParams.has("$filter"), false)
  assert.equal(urls[0].origin + urls[0].pathname, "https://www.microsoft.com/releasecommunications/api/v2/azure")
})

test("asks only for recent changes on later runs", async () => {
  const urls = []
  const fetchImpl = async url => (urls.push(new URL(url)), page([update()]))
  await fetchUpdates({ since: "2026-10-02T10:00:00.000Z", fetchImpl, sleep: noSleep })
  assert.equal(urls.length, 1)
  assert.equal(urls[0].searchParams.get("$filter"), "modified gt 2026-10-02T10:00:00.000Z")
  assert.equal(urls[0].searchParams.get("$orderby"), "modified desc")
})

test("retries a failing page and gives up on a refusal", async () => {
  let calls = 0
  const flaky = async () => (++calls < 3 ? { ok: false, status: 503 } : page([update()]))
  assert.equal((await fetchUpdates({ fetchImpl: flaky, sleep: noSleep })).length, 1)
  assert.equal(calls, 3)

  calls = 0
  await assert.rejects(fetchUpdates({ fetchImpl: async () => (++calls, { ok: false, status: 403 }), sleep: noSleep }), /HTTP 403/)
  assert.equal(calls, 1)

  await assert.rejects(fetchUpdates({ fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }), sleep: noSleep }), /unexpected/)
})

test("stores only what is new or changed", () => {
  const stored = new Map()
  assert.deepEqual(mergeUpdates(stored, [update(), update({ id: "old-one" }), update({ id: "Bad Id" })]), {
    changed: ["AZ574430", "AZ-old-one"],
    skipped: 1
  })
  // The same updates again, as they come back after being written to disk.
  const reread = new Map([...stored].map(([id, message]) => [id, JSON.parse(JSON.stringify(message))]))
  assert.deepEqual(mergeUpdates(reread, [update(), update({ id: "old-one" })]), { changed: [], skipped: 0 })
  assert.deepEqual(mergeUpdates(reread, [update({ status: "In preview" })]), { changed: ["AZ574430"], skipped: 0 })
  assert.equal(reread.get("AZ574430").Details.find(detail => detail.Name === "Status").Value, "In preview")
})
