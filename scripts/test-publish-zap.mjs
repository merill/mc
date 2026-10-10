import assert from "node:assert/strict"
import test from "node:test"

import { BATCH_SIZE, publishRecords, selectChanged, sendBatch, toBatches, toPayload, validateIngestUrl } from "./publish-zap.mjs"

const record = (id, overrides = {}) => ({
  Id: id,
  Title: `Title for ${id}`,
  Source: id.startsWith("RM") ? "roadmap" : "messageCenter",
  Url: `https://mc.merill.net/message/${id}`,
  Services: ["Microsoft Entra"],
  StartDateTime: "2026-08-03T00:00:00Z",
  EndDateTime: null,
  LastModifiedDateTime: "2026-08-03T01:00:00Z",
  IsMajorChange: false,
  Category: "stayInformed",
  Tags: ["New feature"],
  Summary: `Summary for ${id}`,
  ...overrides
})

const ok = body => ({ ok: true, status: 200, json: async () => body })
const failure = status => ({ ok: false, status, json: async () => ({}) })
const noSleep = async () => {}

test("selects new, modified and retitled records only", () => {
  const previous = [record("MC1"), record("MC2"), record("MC3"), record("RM1")]
  const current = [
    record("MC1"),
    record("MC2", { LastModifiedDateTime: "2026-08-04T00:00:00Z" }),
    record("MC3", { Title: "(Updated) Title for MC3" }),
    record("RM1", { ReferencedBy: ["MC1"] }),
    record("MC4")
  ]
  assert.deepEqual(
    selectChanged(current, previous).map(item => item.Id),
    ["MC2", "MC3", "MC4"]
  )
})

test("includes records left pending by an earlier failed run", () => {
  const previous = [record("MC1"), record("MC2")]
  const selected = selectChanged([record("MC1"), record("MC2")], previous, ["MC2", "MC999"])
  assert.deepEqual(selected.map(item => item.Id), ["MC2"])
})

test("selects everything when there is no previous index", () => {
  assert.equal(selectChanged([record("MC1"), record("RM1")], []).length, 2)
})

test("splits records into batches of 200", () => {
  const records = Array.from({ length: 450 }, (_, index) => record(`MC${index}`))
  assert.equal(BATCH_SIZE, 200)
  assert.deepEqual(toBatches(records).map(batch => batch.length), [200, 200, 50])
  assert.deepEqual(toBatches([]), [])
})

test("sends only the stored fields", () => {
  const payload = toPayload([record("MC1", { References: ["MC2"], ReferencedBy: ["MC3"] })])
  assert.deepEqual(Object.keys(payload.records[0]), [
    "Id", "Title", "Source", "Url", "Services", "StartDateTime", "EndDateTime",
    "LastModifiedDateTime", "IsMajorChange", "Category", "Tags", "Summary"
  ])
  assert.equal(payload.records[0].EndDateTime, null)
})

test("accepts https and local http ingest URLs only", () => {
  assert.equal(validateIngestUrl("https://example.com/api/v1/ingest/mc").hostname, "example.com")
  assert.equal(validateIngestUrl("http://localhost:8787/api/v1/ingest/mc").port, "8787")
  assert.throws(() => validateIngestUrl("http://example.com/ingest"), /HTTPS/)
  assert.throws(() => validateIngestUrl("not a url"), /valid URL/)
})

test("sends the bearer token and JSON body", async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return ok({ upserted: 1, storiesCreated: 1, skipped: 0 })
  }
  const result = await sendBatch([record("MC1")], { url: "https://example.com/ingest", token: "secret", fetchImpl })
  assert.deepEqual(result, { upserted: 1, storiesCreated: 1, skipped: 0 })
  assert.equal(calls[0].init.method, "POST")
  assert.equal(calls[0].init.headers.authorization, "Bearer secret")
  assert.equal(JSON.parse(calls[0].init.body).records[0].Id, "MC1")
})

test("retries server errors and network failures, not client errors", async () => {
  let attempts = 0
  const flaky = async () => {
    attempts++
    if (attempts === 1) throw new Error("network down")
    return attempts === 2 ? failure(503) : ok({ upserted: 1 })
  }
  await sendBatch([record("MC1")], { url: "https://example.com", token: "t", fetchImpl: flaky, sleep: noSleep })
  assert.equal(attempts, 3)

  let unauthorized = 0
  await assert.rejects(
    sendBatch([record("MC1")], {
      url: "https://example.com",
      token: "t",
      sleep: noSleep,
      fetchImpl: async () => {
        unauthorized++
        return failure(401)
      }
    }),
    /HTTP 401/
  )
  assert.equal(unauthorized, 1)
})

test("keeps going after a failed batch and reports its ids", async () => {
  const records = Array.from({ length: 450 }, (_, index) => record(`MC${index}`))
  let call = 0
  const fetchImpl = async () => {
    call++
    return call === 2 ? failure(400) : ok({ upserted: 10, storiesCreated: 5, skipped: 1 })
  }
  const totals = await publishRecords(records, { url: "https://example.com", token: "t", fetchImpl, sleep: noSleep })
  assert.equal(totals.sent, 250)
  assert.equal(totals.upserted, 20)
  assert.equal(totals.storiesCreated, 10)
  assert.equal(totals.skipped, 2)
  assert.equal(totals.failedIds.length, 200)
  assert.equal(totals.failedIds[0], "MC200")
})
