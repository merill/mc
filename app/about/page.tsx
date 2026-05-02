import { Metadata } from "next"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: "About",
  description: "About the Microsoft 365 Message Center and Roadmap Archive, why it exists, and how the data is collected.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: `About | ${siteConfig.name}`,
    description: "Why this Microsoft 365 Message Center and Roadmap archive exists and how it works.",
    url: "/about",
    images: ["/og-default.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `About | ${siteConfig.name}`,
    description: "Why this Microsoft 365 Message Center and Roadmap archive exists and how it works.",
    images: ["/og-default.png"],
  },
}

export default function AboutPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">About this archive</h1>
        <p className="text-base text-muted-foreground md:text-lg">
          I&apos;m Merill Fernando. I build tools and write about Microsoft 365 and Microsoft Entra to help admins keep up with constant change.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Why I built this</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            <p>
              Message Center posts are useful, but they are hard to link to, search, and reference outside the Microsoft 365 admin center. I built this archive so posts can be found quickly and shared from places like Entra.News.
            </p>
            <p>
              This site is for reference only. Message Center posts are customized by tenant, so always use your own tenant&apos;s Message Center as the source of truth.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            <p>
              A scheduled job reads Message Center posts from a Microsoft 365 test tenant through Microsoft Graph, saves each post for history, and publishes a searchable static site.
            </p>
            <p>
              The site also imports Microsoft 365 Roadmap RSS items, generates static pages, and exposes sitemap, RSS, and AI-friendly index files for discovery.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Help improve tenant coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
          <p>
            Some entries may be missing, especially posts shown only to EDU, government, or tenants with additional products and licenses. I&apos;m always eager to connect with folks who can help make the archive more complete.
          </p>
          <p>
            If you have a test tenant and can create a read-only service principal for Message Center access, please reach out through {" "}
            <Link className="font-medium text-foreground underline underline-offset-4" href="https://linkedin.com/in/merill">
              LinkedIn
            </Link>
            , {" "}
            <Link className="font-medium text-foreground underline underline-offset-4" href="https://twitter.com/merill">
              X
            </Link>
            , or {" "}
            <Link className="font-medium text-foreground underline underline-offset-4" href="https://bsky.app/profile/merill.net">
              Bluesky
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
