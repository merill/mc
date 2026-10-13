import assert from "node:assert/strict"
import test from "node:test"

import { GIVE_UP_AFTER, changedIds, historyUrl, publishHistories, sendHistory, toPublished } from "./publish-history.mjs"

const message = (overrides = {}) => ({
  Id: "MC1",
  Title: "A title",
  Source: "messageCenter",
  Body: { Content: "<p>Body</p>", ContentType: "html", Markdown: "Body" },
  Services: ["Microsoft Entra"],
  Tags: ["New feature"],
  Category: "stayInformed",
  Severity: "normal",
  IsMajorChange: false,
  StartDateTime: "2026-08-03T00:00:00Z",
  EndDateTime: null,
  LastModifiedDateTime: "2026-08-03T01:00:00Z",
  ActionRequiredByDateTime: null,
  Details: [
    { Name: "Summary", Value: "Short" },
    { Name: "FeatureStatusJson", Value: "[{}]" }
  ],
  ViewPoint: { IsRead: null },
  AdditionalProperties: {},
  ...overrides
})

const history = (id, versions = 2) => ({
  id,
  versions: Array.from({ length: versions }, (_, index) => ({
    capturedAt: `2026-08-0${index + 1}T00:00:00Z`,
    source: "ingest",
    sha: "abc",
    message: message({ Id: id, Title: `Version ${index + 1}` })
  }))
})

const ok = () => ({ ok: true, status: 204 })
const failure = status => ({ ok: false, status })
const noSleep = async () => {}

test("reads post ids from git's list of changed history files", () => {
  const porcelain = [
    " M @data/history/MC1.json",
    "?? @data/history/RM2.json",
    "A  @data/history/AZ-some-old-update.json",
    " M @data/messages.json",
    "?? @data/history/notes.txt",
    ""
  ].join("\n")
  assert.deepEqual(changedIds(porcelain), ["MC1", "RM2", "AZ-some-old-update"])
  assert.deepEqual(changedIds(""), [])
})

test("lists a changed file once", () => {
  assert.deepEqual(changedIds("MM @data/history/MC1.json\n M @data/history/MC1.json"), ["MC1"])
})

test("leaves a history with one version alone", () => {
  assert.equal(toPublished(history("MC1", 1)), null)
  assert.equal(toPublished(null), null)
  assert.equal(toPublished({ id: "MC1" }), null)
})

test("sends every version with only what the viewer shows", () => {
  const published = toPublished(history("MC1", 3))
  assert.equal(published.id, "MC1")
  assert.deepEqual(published.versions.map(version => version.message.Title), ["Version 1", "Version 2", "Version 3"])

  const [first] = published.versions
  assert.deepEqual(Object.keys(first), ["capturedAt", "message"])
  assert.deepEqual(first.message.Body, { Content: "<p>Body</p>" })
  assert.deepEqual(first.message.Details, [{ Name: "Summary", Value: "Short" }])
  for (const dropped of ["ViewPoint", "AdditionalProperties", "EndDateTime", "ActionRequiredByDateTime"]) {
    assert.equal(dropped in first.message, false, dropped)
  }
})

test("addresses a history beside the index ingest", () => {
  assert.equal(historyUrl("https://zap.ms/api/v1/ingest/mc", "MC1"), "https://zap.ms/api/v1/ingest/mc/history/MC1")
  assert.equal(historyUrl(new URL("https://zap.ms/api/v1/ingest/mc/"), "AZ-a-b"), "https://zap.ms/api/v1/ingest/mc/history/AZ-a-b")
})

test("puts a history with the bearer token", async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return ok()
  }
  await sendHistory(toPublished(history("MC1")), { url: "https://zap.ms/api/v1/ingest/mc", token: "secret", fetchImpl })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "https://zap.ms/api/v1/ingest/mc/history/MC1")
  assert.equal(calls[0].init.method, "PUT")
  assert.equal(calls[0].init.headers.authorization, "Bearer secret")
  assert.equal(JSON.parse(calls[0].init.body).versions.length, 2)
})

test("retries a busy or failing receiver, not a refusal", async () => {
  let calls = 0
  const flaky = async () => (++calls < 3 ? failure(503) : ok())
  await sendHistory(toPublished(history("MC1")), { url: "https://zap.ms/x", token: "t", fetchImpl: flaky, sleep: noSleep })
  assert.equal(calls, 3)

  calls = 0
  const refused = async () => (++calls, failure(401))
  await assert.rejects(
    sendHistory(toPublished(history("MC1")), { url: "https://zap.ms/x", token: "t", fetchImpl: refused, sleep: noSleep }),
    /HTTP 401/
  )
  assert.equal(calls, 1)
})

test("reports what was sent, skipped and left to retry", async () => {
  const stored = { MC1: history("MC1"), MC2: history("MC2", 1), MC3: history("MC3"), MC4: null }
  const fetchImpl = async url => (url.endsWith("/MC3") ? failure(400) : ok())
  const totals = await publishHistories(Object.keys(stored), async id => stored[id], {
    url: "https://zap.ms/x",
    token: "t",
    fetchImpl,
    sleep: noSleep,
    concurrency: 1
  })
  assert.deepEqual(totals, { sent: 1, skipped: 2, failedIds: ["MC3"] })
})

test("stops sending once the receiver looks down, and queues the rest", async () => {
  const ids = Array.from({ length: GIVE_UP_AFTER + 10 }, (_, index) => `MC${index}`)
  let calls = 0
  const totals = await publishHistories(ids, async id => history(id), {
    url: "https://zap.ms/x",
    token: "t",
    fetchImpl: async () => (++calls, failure(404)),
    sleep: noSleep,
    concurrency: 1
  })
  assert.equal(calls, GIVE_UP_AFTER)
  assert.equal(totals.sent, 0)
  assert.deepEqual(totals.failedIds, ids)
})
