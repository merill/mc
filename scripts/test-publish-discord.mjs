import assert from "node:assert/strict"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { MessageCenterDiscordPublisher } from "./publish-discord.mjs"

const message = {
  Id: "MC123456",
  Title: "Microsoft Entra: New administrator capability",
  Source: "messageCenter",
  Url: "https://mc.merill.net/message/MC123456",
  Services: ["Microsoft Entra"],
  StartDateTime: "2026-08-03T00:00:00Z",
  LastModifiedDateTime: "2026-08-03T01:00:00Z",
  IsMajorChange: true,
  Category: "planForChange",
  Tags: ["Admin impact", "New feature"],
  Summary: "Administrators can configure a newly announced Microsoft Entra capability."
}

test("builds a safe Message Center Discord embed", () => {
  const publisher = new MessageCenterDiscordPublisher({
    webhookUrl: "https://discord.com/api/webhooks/123/token",
    enabled: true
  })
  const payload = publisher.buildPayload(publisher.createEvent(message))

  assert.deepEqual(payload.allowed_mentions, { parse: [] })
  assert.match(payload.embeds[0].title, /MC123456/)
  assert.match(payload.embeds[0].fields[2].value, /mc\.merill\.net/)
})

test("publishes new Entra messages once and retains delivery state", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mc-discord-test-"))
  const outboxPath = path.join(directory, "outbox.json")
  const statePath = path.join(directory, "state.json")
  const requests = []
  await fs.writeFile(outboxPath, JSON.stringify([message]))

  try {
    const publisher = new MessageCenterDiscordPublisher({
      webhookUrl: "https://discord.com/api/webhooks/123/token",
      enabled: true,
      outboxPath,
      statePath,
      fetchImpl: async (url, request) => {
        requests.push({ url: String(url), payload: JSON.parse(request.body) })
        return { ok: true, status: 200, headers: { get: () => null } }
      }
    })

    const first = await publisher.publish()
    const second = await publisher.publish()
    const state = JSON.parse(await fs.readFile(statePath, "utf8"))

    assert.equal(first.published, 1)
    assert.equal(second.published, 0)
    assert.equal(requests.length, 1)
    assert.equal(Object.keys(state.published).length, 1)
    assert.equal(Object.keys(state.pending).length, 0)
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})

test("queues messages when the webhook has not been configured", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mc-discord-queue-test-"))
  const outboxPath = path.join(directory, "outbox.json")
  const statePath = path.join(directory, "state.json")
  await fs.writeFile(outboxPath, JSON.stringify([message]))

  try {
    const publisher = new MessageCenterDiscordPublisher({ enabled: false, outboxPath, statePath })
    const result = await publisher.publish()
    assert.equal(result.pending, 1)
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})
