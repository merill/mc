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

const {
  historyHref,
  legacyHistoryRedirect,
  readHistoryRequest,
  readPublishedHistory,
  resolveVersion,
  slugifyCapturedAt,
  versionAt
} = await loadTypeScriptModule("../lib/history.ts")
const { linkifyIds, metadataChanges, summarizeChanges } = await loadTypeScriptModule("../lib/message-format.ts")

// Versions 2 and 3 were captured at the same moment, as happens in the archive.
const entries = [
  { number: 1, slug: "2025-02-21T23-43-28-537Z" },
  { number: 2, slug: "2025-04-17T19-36-40-083Z" },
  { number: 3, slug: "2025-04-17T19-36-40-083Z" },
  { number: 4, slug: "2025-05-01T10-00-00Z" }
]

test("makes a capture time safe for an address", () => {
  assert.equal(slugifyCapturedAt("2025-02-21T23:43:28.537Z"), "2025-02-21T23-43-28-537Z")
})

test("resolves a version number, or the capture time older links used", () => {
  assert.equal(resolveVersion("3", entries), 3)
  assert.equal(resolveVersion("2025-05-01T10-00-00Z", entries), 4)
  // A capture time shared by two versions means the earlier one.
  assert.equal(resolveVersion("2025-04-17T19-36-40-083Z", entries), 2)
  for (const unknown of ["0", "5", "-1", "1.5", "abc", "", null, undefined]) {
    assert.equal(resolveVersion(unknown, entries), null, String(unknown))
  }
})

test("reads what an address asks to see", () => {
  assert.deepEqual(readHistoryRequest("?v=2", entries), { kind: "snapshot", version: 2 })
  assert.deepEqual(readHistoryRequest("?from=1&to=4", entries), { kind: "compare", from: 1, to: 4 })
  assert.deepEqual(readHistoryRequest("?from=4&to=1", entries), { kind: "compare", from: 4, to: 1 })
  assert.deepEqual(readHistoryRequest("?from=2025-02-21T23-43-28-537Z&to=2025-05-01T10-00-00Z", entries), {
    kind: "compare",
    from: 1,
    to: 4
  })
  // Other parameters on the page are not its business.
  assert.deepEqual(readHistoryRequest("?utm_source=x&v=1", entries), { kind: "snapshot", version: 1 })
})

test("asks for nothing when the address names no real version", () => {
  for (const search of ["", "?v=9", "?from=1", "?from=1&to=1", "?from=1&to=9", "?q=entra"]) {
    assert.equal(readHistoryRequest(search, entries), null, search)
  }
})

test("writes the address for a version, keeping unrelated parameters", () => {
  assert.equal(historyHref("MC1", { kind: "snapshot", version: 2 }), "/message/MC1?v=2#version-history")
  assert.equal(
    historyHref("MC1", { kind: "compare", from: 1, to: 4 }, "?utm_source=x&v=2"),
    "/message/MC1?utm_source=x&from=1&to=4#version-history"
  )
  assert.equal(historyHref("MC1", null, "?from=1&to=4"), "/message/MC1#version-history")
})

test("an address round-trips through read and write", () => {
  for (const request of [
    { kind: "snapshot", version: 3 },
    { kind: "compare", from: 2, to: 4 }
  ]) {
    const href = historyHref("MC1", request)
    assert.deepEqual(readHistoryRequest(new URL(href, "https://mc.merill.net").search, entries), request)
  }
})

test("sends the old per-version pages to the post's page", () => {
  assert.equal(
    legacyHistoryRedirect("/message/MC1013464/v/2025-02-21T23-43-28-537Z"),
    "/message/MC1013464?v=2025-02-21T23-43-28-537Z#version-history"
  )
  assert.equal(
    legacyHistoryRedirect("/message/MC1/compare/2025-02-21T23-43-28-537Z/2025-05-01T10-00-00Z/"),
    "/message/MC1?from=2025-02-21T23-43-28-537Z&to=2025-05-01T10-00-00Z#version-history"
  )
  assert.equal(legacyHistoryRedirect("/message/MC1/v/2025-05-01T10-00-00Z.html"), "/message/MC1?v=2025-05-01T10-00-00Z#version-history")
  for (const other of ["/message/MC1", "/message/MC1/v", "/message/MC1/compare/a", "/about", "/message/MC1/v/a/b"]) {
    assert.equal(legacyHistoryRedirect(other), null, other)
  }
})

test("a redirected old address resolves to a version", () => {
  const target = legacyHistoryRedirect("/message/MC1/compare/2025-02-21T23-43-28-537Z/2025-05-01T10-00-00Z")
  assert.deepEqual(readHistoryRequest(new URL(target, "https://mc.merill.net").search, entries), {
    kind: "compare",
    from: 1,
    to: 4
  })
})

test("accepts a history from zap.ms only in the expected shape", () => {
  const history = {
    id: "MC1",
    versions: [
      { capturedAt: "2025-02-21T23:43:28.537Z", message: { Title: "One" } },
      { capturedAt: "2025-05-01T10:00:00Z", message: { Title: "Two" } }
    ]
  }
  assert.equal(readPublishedHistory(history), history)
  assert.equal(versionAt(history, 2).message.Title, "Two")
  assert.equal(versionAt(history, 3), null)
  assert.equal(versionAt(history, 0), null)

  for (const bad of [null, "x", {}, { id: "MC1" }, { id: "MC1", versions: [{ capturedAt: 1, message: {} }] }, { id: "MC1", versions: [{ capturedAt: "x", message: null }] }]) {
    assert.equal(readPublishedHistory(bad), null, JSON.stringify(bad))
  }
})

const message = (overrides = {}) => ({
  Title: "Title",
  Body: { Content: "<p>Body</p>" },
  Tags: ["New feature", "Admin impact"],
  Services: ["Microsoft Entra"],
  Category: "stayInformed",
  Severity: "normal",
  IsMajorChange: false,
  ActionRequiredByDateTime: null,
  EndDateTime: "2026-12-01T00:00:00Z",
  Details: [{ Name: "Status", Value: "In development" }],
  ...overrides
})

test("names the fields that changed between two versions", () => {
  assert.deepEqual(summarizeChanges(undefined, message()), ["Initial version"])
  assert.deepEqual(summarizeChanges(message(), message()), ["No tracked field changed"])
  // Order within a list is not a change.
  assert.deepEqual(summarizeChanges(message(), message({ Tags: ["Admin impact", "New feature"] })), ["No tracked field changed"])
  assert.deepEqual(
    summarizeChanges(
      message(),
      message({
        Title: "New title",
        Body: { Content: "<p>New</p>" },
        IsMajorChange: true,
        Details: [{ Name: "Status", Value: "Rolling out" }]
      })
    ),
    ["Title", "Body", "Major change flag", "Status"]
  )
})

test("lists changed metadata with the old and new value", () => {
  assert.deepEqual(metadataChanges(message(), message()), [])
  assert.deepEqual(
    metadataChanges(
      message(),
      message({ Services: ["Microsoft Entra", "Microsoft Intune"], Details: [{ Name: "Status", Value: "Launched" }] })
    ),
    [
      { label: "Services", oldValue: "Microsoft Entra", newValue: "Microsoft Entra, Microsoft Intune" },
      { label: "Status", oldValue: "In development", newValue: "Launched" }
    ]
  )
})

test("links known Message Center ids, outside existing links only", () => {
  const known = id => id === "MC1234567"
  assert.equal(
    linkifyIds("<p>See MC1234567 and MC7654321.</p>", known),
    '<p>See <a href="/message/MC1234567" class="mc-ref-link" data-mc-ref="MC1234567">MC1234567</a> and MC7654321.</p>'
  )
  const linked = '<p><a href="https://admin.microsoft.com/x">MC1234567</a></p>'
  assert.equal(linkifyIds(linked, known), linked)
  assert.equal(linkifyIds("<p>MC1234567</p>", known, "MC1234567"), "<p>MC1234567</p>")
  assert.equal(linkifyIds(null, known), "")
})
