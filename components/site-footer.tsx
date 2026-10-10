import Link from "next/link"

import { siteConfig } from "@/config/site"
import { Icons } from "@/components/icons"

const link =
  "inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container flex flex-wrap items-center justify-end gap-x-6 gap-y-3 py-6 text-sm text-muted-foreground">
        <nav
          aria-label="Follow and source"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          {/* A plain anchor, not next/link: rss.xml is a static file in
              public/, not a route the client router can navigate to. */}
          <a
            href={siteConfig.links.rss}
            type="application/rss+xml"
            className={link}
          >
            <Icons.rss className="size-4" aria-hidden="true" />
            RSS feed
          </a>
          <Link
            href={siteConfig.links.github}
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            <Icons.gitHub className="size-4" aria-hidden="true" />
            GitHub
          </Link>
          <Link
            href={siteConfig.links.twitter}
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            <Icons.twitter className="size-4 fill-current" aria-hidden="true" />
            Twitter
          </Link>
        </nav>
      </div>
    </footer>
  )
}
