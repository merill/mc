import { Metadata } from "next"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "About",
  description:
    "About the Microsoft 365 Message Center and Roadmap Archive, why it exists, and how the data is collected.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: `About | ${siteConfig.name}`,
    description:
      "Why this Microsoft 365 Message Center and Roadmap archive exists and how it works.",
    url: "/about",
    images: ["/og-default.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `About | ${siteConfig.name}`,
    description:
      "Why this Microsoft 365 Message Center and Roadmap archive exists and how it works.",
    images: ["/og-default.png"],
  },
}

export default function AboutPage() {
  return (
    <section className="page-shell">
      <div className="page-intro">
        <h1 className="page-title">About this archive</h1>
        <p className="page-description">
          I&apos;m Merill Fernando. I build tools and write about Microsoft 365
          and Microsoft Entra to help admins keep up with constant change.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Why I built this</CardTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <p>
              Message Center posts are useful, but they are hard to link to,
              search, and reference outside the Microsoft 365 admin center. I
              built this archive so posts can be found quickly and shared from
              places like Entra.News.
            </p>
            <p>
              This site is for reference only. Message Center posts are
              customized by tenant, so always use your own tenant&apos;s Message
              Center as the source of truth.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="readable-card-content">
            <p>
              A scheduled job reads Message Center posts from a Microsoft 365
              test tenant through Microsoft Graph, saves each post for history,
              and publishes a searchable static site.
            </p>
            <p>
              The site also imports Microsoft 365 Roadmap RSS items, generates
              static pages, and exposes sitemap, RSS, and AI-friendly index
              files for discovery.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Help improve tenant coverage</CardTitle>
        </CardHeader>
        <CardContent className="readable-card-content">
          <p>
            Some entries may be missing, especially posts shown only to EDU,
            government, or tenants with additional products and licenses.
            I&apos;m always eager to connect with folks who can help make the
            archive more complete.
          </p>
          <p>
            If you have a test tenant and can create a read-only service
            principal for Message Center access, please reach out through{" "}
            <Link
              className="readable-link"
              href="https://linkedin.com/in/merill"
            >
              LinkedIn
            </Link>
            ,{" "}
            <Link className="readable-link" href="https://twitter.com/merill">
              X
            </Link>
            , or{" "}
            <Link
              className="readable-link"
              href="https://bsky.app/profile/merill.net"
            >
              Bluesky
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Release notes</CardTitle>
        </CardHeader>
        <CardContent className="readable-card-content space-y-5">
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              May 3, 2026
            </h2>
            <ul>
              <li>
                Added click-to-enlarge image previews on Message Center and
                Roadmap detail pages, with a fullscreen lightbox and keyboard
                support.
              </li>
              <li>
                Added per-message version history with a timeline of prior
                versions, dedicated snapshot pages for each version, and
                inline visual diffs (additions in green, deletions in red)
                comparing any two versions of a Message Center or Roadmap
                post.
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              May 2, 2026
            </h2>
            <ul>
              <li>
                Added Microsoft 365 Roadmap posts alongside Message Center
                posts, with source labels, icons, filtering, and detail pages.
              </li>
              <li>
                Added archived Message Center support, including archive-only
                detail pages, expired badges, and expired announcement banners.
              </li>
              <li>
                Improved home page performance with precomputed service filters
                and natural incremental row loading.
              </li>
              <li>
                Added searchable multi-select service filtering, wider
                fixed-width dropdown behavior, and source filters for Message
                Center and Roadmap.
              </li>
              <li>
                Added SEO and sharing support with canonical metadata, Open
                Graph and Twitter cards, sitemap, robots file, and a branded
                social image.
              </li>
              <li>
                Added AI-friendly discovery through llms.txt and a compact
                messages-index.json for agents and search tools.
              </li>
              <li>
                Added a skills.sh-compatible agent skill and Skill page for
                AI-assisted archive search and canonical citation.
              </li>
              <li>
                Added a static RSS feed with the latest 500 active Message
                Center and Roadmap items.
              </li>
              <li>
                Added this About page, updated homepage guidance about
                tenant-specific Message Center posts, and added top navigation
                links.
              </li>
              <li>
                Updated dependencies to clear Dependabot vulnerabilities and
                moved the site to Next.js 15.
              </li>
              <li>
                Improved the data refresh script, including more reliable
                Roadmap fetching on GitHub Actions.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
