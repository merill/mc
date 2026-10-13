import assert from "node:assert/strict"
import fs from "node:fs/promises"
import test from "node:test"
import ts from "typescript"

// Use the project's compiler so these tests also run on Node 20.
async function loadTypeScriptModule(relativePath) {
  const source = await fs.readFile(
    new URL(relativePath, import.meta.url),
    "utf8"
  )
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  })

  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  )
}

const {
  DEFAULT_VIEW,
  cleanViewName,
  describeNarrowing,
  inView,
  narrowedBy,
  newViewId,
  readSavedViews,
  readViewSettings,
  sameViewSettings,
} = await loadTypeScriptModule("../lib/views.ts")

test("fills in whatever a stored view is missing or gets wrong", () => {
  assert.deepEqual(readViewSettings(null), DEFAULT_VIEW)
  assert.deepEqual(readViewSettings({ source: "nope", sort: { id: "x" } }), DEFAULT_VIEW)
  assert.deepEqual(
    readViewSettings({
      source: "roadmap",
      services: ["Teams", "Entra", "Teams", 7, ""],
      majorOnly: true,
      hideExpired: "yes",
      sort: { id: "title", desc: false },
      columns: ["lastUpdated", "made-up", "source"],
      fromTheFuture: 1,
    }),
    {
      source: "roadmap",
      services: ["Entra", "Teams"],
      majorOnly: true,
      hideExpired: false,
      sort: { id: "title", desc: false },
      columns: ["source", "lastUpdated"],
    }
  )
})

test("a view with no columns chosen keeps it that way", () => {
  assert.deepEqual(readViewSettings({ columns: [] }).columns, [])
})

test("compares views by what they show, not how they were written", () => {
  const a = { ...DEFAULT_VIEW, services: ["B", "A"], columns: ["lastUpdated", "service"] }
  const b = { ...DEFAULT_VIEW, services: ["A", "B"] }
  assert.equal(sameViewSettings(a, b), true)
  assert.equal(sameViewSettings(a, { ...b, majorOnly: true }), false)
  assert.equal(sameViewSettings(a, { ...b, sort: { id: "id", desc: true } }), false)
})

test("decides which rows a view shows", () => {
  const row = { source: "messageCenter", service: ["Teams"], isMajor: false, isArchived: true }
  assert.equal(inView(row, DEFAULT_VIEW), true)
  assert.equal(inView(row, { ...DEFAULT_VIEW, source: "roadmap" }), false)
  assert.equal(inView(row, { ...DEFAULT_VIEW, services: ["Entra", "Teams"] }), true)
  assert.equal(inView(row, { ...DEFAULT_VIEW, services: ["Entra"] }), false)
  assert.equal(inView(row, { ...DEFAULT_VIEW, majorOnly: true }), false)
  assert.equal(inView(row, { ...DEFAULT_VIEW, hideExpired: true }), false)
  assert.equal(inView({ source: "roadmap" }, { ...DEFAULT_VIEW, services: ["Teams"] }), false)
  assert.equal(inView({ source: "azure" }, { ...DEFAULT_VIEW, source: "azure" }), true)
  assert.equal(inView(row, { ...DEFAULT_VIEW, source: "azure" }), false)
  // An Azure update from years ago is old, not expired.
  assert.equal(inView({ source: "azure", isArchived: false }, { ...DEFAULT_VIEW, hideExpired: true }), true)
  assert.equal(readViewSettings({ source: "azure" }).source, "azure")
  assert.equal(narrowedBy({ ...DEFAULT_VIEW, majorOnly: true, hideExpired: true }), 2)
})

test("reads saved views and drops what is not one", () => {
  const views = readSavedViews([
    { id: "v1", name: "Mine", settings: { majorOnly: true } },
    { id: "v2", name: "" },
    "nope",
    { name: "No id" },
  ])
  assert.equal(views.length, 1)
  assert.equal(views[0].settings.majorOnly, true)
  assert.deepEqual(views[0].settings.columns, DEFAULT_VIEW.columns)
  assert.deepEqual(readSavedViews("nope"), [])
})

test("tidies a name and makes ids zap.ms accepts", () => {
  assert.equal(cleanViewName("  My \n  products  "), "My products")
  assert.equal(cleanViewName("x".repeat(80)).length, 40)
  assert.match(newViewId(), /^[A-Za-z0-9_-]{1,40}$/)
  assert.notEqual(newViewId(() => 0.1), newViewId(() => 0.9))
})

test("says what besides the source is narrowing the list", () => {
  assert.deepEqual(describeNarrowing(DEFAULT_VIEW), [])
  assert.deepEqual(describeNarrowing({ ...DEFAULT_VIEW, source: "azure" }), [])
  assert.deepEqual(describeNarrowing({ ...DEFAULT_VIEW, services: ["Microsoft Entra"] }), ["the service Microsoft Entra"])
  assert.deepEqual(
    describeNarrowing({ ...DEFAULT_VIEW, services: ["Exchange", "Teams"], majorOnly: true, hideExpired: true }),
    ["the 2 selected services", "major changes only", "expired posts hidden"]
  )
})
