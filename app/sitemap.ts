import { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"
import { getAllMessageIds, getMessageData } from "@/lib/messages"

export const dynamic = "force-static"

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

  const pages = ["about", "contribute", "discuss"].map((path) => ({
    url: `${siteConfig.url}/${path}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }))

  return [home, ...pages, ...messages]
}
