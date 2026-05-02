import { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"
import { getAllMessageIds, getMessageData } from "@/lib/messages"

export default function sitemap(): MetadataRoute.Sitemap {
  const home = {
    url: siteConfig.url,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 1,
  }

  const messages = getAllMessageIds().map(({ id }) => {
    const msg = getMessageData(id)
    const lastModified = msg?.LastModifiedDateTime || msg?.StartDateTime

    return {
      url: `${siteConfig.url}/message/${id}`,
      lastModified: lastModified ? new Date(lastModified) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }
  })

  return [home, ...messages]
}
