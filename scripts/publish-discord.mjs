import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export class MessageCenterDiscordPublisher {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl ?? process.env.DISCORD_ENTRA_MC_WEBHOOK_URL ?? ""
    this.enabled = options.enabled ?? (process.env.DISCORD_ENABLED !== "false" && Boolean(this.webhookUrl))
    this.dryRun = options.dryRun ?? process.env.DISCORD_DRY_RUN === "true"
    this.outboxPath = options.outboxPath ?? path.join(ROOT, "@data", "discord-outbox.json")
    this.statePath = options.statePath ?? path.join(ROOT, "@data", "discord-state.json")
    this.fetchImpl = options.fetchImpl ?? global.fetch
    this.sleep = options.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)))
    this.maximumAttempts = options.maximumAttempts ?? 4
  }

  truncate(value, maximumLength) {
    const text = String(value ?? "").trim()
    if (text.length <= maximumLength) return text
    return `${text.substring(0, Math.max(0, maximumLength - 1)).trim()}…`
  }

  validateWebhookUrl() {
    let url
    try {
      url = new URL(this.webhookUrl)
    } catch {
      throw new Error("DISCORD_ENTRA_MC_WEBHOOK_URL is not a valid URL")
    }

    const allowedHosts = new Set(["discord.com", "www.discord.com", "discordapp.com", "www.discordapp.com"])
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || !url.pathname.startsWith("/api/webhooks/")) {
      throw new Error("DISCORD_ENTRA_MC_WEBHOOK_URL must be an HTTPS Discord webhook URL")
    }
  }

  async loadJson(filePath, fallback) {
    try {
      return JSON.parse(await fs.readFile(filePath, "utf8"))
    } catch (error) {
      if (error.code !== "ENOENT") console.warn(`[discord] unable to read ${filePath}: ${error.message}`)
      return fallback
    }
  }

  async saveState(state) {
    await fs.mkdir(path.dirname(this.statePath), { recursive: true })
    const temporaryPath = `${this.statePath}.tmp`
    await fs.writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`)
    await fs.rename(temporaryPath, this.statePath)
  }

  createEvent(message) {
    return {
      eventId: `message-center:${message.Id}`,
      id: message.Id,
      title: message.Title,
      summary: message.Summary,
      url: message.Url || `https://mc.merill.net/message/${message.Id}`,
      services: Array.isArray(message.Services) ? message.Services : [],
      category: message.Category,
      tags: Array.isArray(message.Tags) ? message.Tags : [],
      isMajorChange: Boolean(message.IsMajorChange),
      publishedAt: message.StartDateTime || message.LastModifiedDateTime
    }
  }

  buildPayload(event) {
    const metadata = [event.category, event.isMajorChange ? "Major change" : null, ...event.tags]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(" · ")

    const timestamp = new Date(event.publishedAt)
    return {
      allowed_mentions: { parse: [] },
      embeds: [{
        title: this.truncate(`${event.id} — ${event.title}`, 256),
        url: event.url,
        description: this.truncate(event.summary || "A new Microsoft Entra Message Center post was published.", 4096),
        color: event.isMajorChange ? 0xe67e22 : 0x0078d4,
        fields: [
          {
            name: "Service",
            value: this.truncate(event.services.join(", ") || "Microsoft Entra", 1024),
            inline: true
          },
          {
            name: "Classification",
            value: this.truncate(metadata || "Message Center", 1024),
            inline: true
          },
          {
            name: "Read the archived post",
            value: `[Open ${event.id} on mc.merill.net](${event.url})`,
            inline: false
          }
        ],
        footer: { text: "Microsoft Entra Message Center · Posts can vary by tenant" },
        timestamp: Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString()
      }]
    }
  }

  getRetryDelay(response, responseBody, attempt) {
    const headerValue = Number(response.headers?.get?.("retry-after"))
    if (Number.isFinite(headerValue) && headerValue > 0) return Math.ceil(headerValue * 1000)
    const bodyValue = Number(responseBody?.retry_after)
    if (Number.isFinite(bodyValue) && bodyValue > 0) return Math.ceil(bodyValue * 1000)
    return 1000 * 2 ** attempt
  }

  async sendPayload(payload) {
    const url = new URL(this.webhookUrl)
    url.searchParams.set("wait", "true")

    for (let attempt = 0; attempt < this.maximumAttempts; attempt++) {
      let response
      let responseBody = null
      try {
        response = await this.fetchImpl(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        })
        if (response.ok) return
        try {
          responseBody = await response.json()
        } catch {
          responseBody = null
        }
      } catch (error) {
        if (attempt === this.maximumAttempts - 1) throw error
        await this.sleep(1000 * 2 ** attempt)
        continue
      }

      const retryable = response.status === 429 || response.status >= 500
      if (!retryable || attempt === this.maximumAttempts - 1) {
        throw new Error(`Discord webhook returned HTTP ${response.status}${responseBody?.message ? `: ${responseBody.message}` : ""}`)
      }
      await this.sleep(this.getRetryDelay(response, responseBody, attempt))
    }
  }

  async publish() {
    const messages = await this.loadJson(this.outboxPath, [])
    const state = await this.loadJson(this.statePath, { version: 1, published: {}, pending: {} })
    state.version = 1
    state.published = state.published && typeof state.published === "object" ? state.published : {}
    state.pending = state.pending && typeof state.pending === "object" ? state.pending : {}

    for (const message of Array.isArray(messages) ? messages : []) {
      const event = this.createEvent(message)
      if (!state.published[event.eventId]) state.pending[event.eventId] = event
    }

    if (!this.enabled) {
      await this.saveState(state)
      console.log(`[discord] webhook not configured; ${Object.keys(state.pending).length} message(s) remain queued`)
      return { published: 0, pending: Object.keys(state.pending).length }
    }
    this.validateWebhookUrl()

    if (this.dryRun) {
      await this.saveState(state)
      console.log(`[discord] dry run: ${Object.keys(state.pending).length} message(s) would be published`)
      return { published: 0, pending: Object.keys(state.pending).length }
    }

    let publishedCount = 0
    for (const [eventId, event] of Object.entries(state.pending)) {
      try {
        await this.sendPayload(this.buildPayload(event))
        state.published[eventId] = new Date().toISOString()
        delete state.pending[eventId]
        publishedCount++
        await this.saveState(state)
      } catch (error) {
        console.error(`[discord] delivery failed for ${eventId}: ${error.message}`)
      }
    }

    await this.saveState(state)
    const pendingCount = Object.keys(state.pending).length
    console.log(`[discord] delivery complete: ${publishedCount} published, ${pendingCount} pending`)
    return { published: publishedCount, pending: pendingCount }
  }
}

async function main() {
  try {
    await new MessageCenterDiscordPublisher().publish()
  } catch (error) {
    console.error(`[discord] publisher could not start: ${error.message}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
