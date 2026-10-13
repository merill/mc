import Link from "next/link"

import ActiveDiscussions from "@/components/active-discussions"

import MessagesTable2 from "./messages-table/messages-table"

export default function IndexPage() {
  return (
    <section className="page-shell md:pt-8">
      {/* The header already carries the site's name, so the page says it only
          to search engines and screen readers, and keeps one quiet line on
          what the site is. */}
      {/* Pulled up against what follows: it is a caption, not a section. */}
      <div className="-mb-5 min-w-0">
        <h1 className="sr-only">
          Microsoft 365 Message Center, Roadmap and Azure Updates Archive
        </h1>
        <p className="text-sm text-muted-foreground">
          An unofficial archive of Microsoft 365 Message Center, Roadmap and
          Azure Updates posts.{" "}
          <Link
            href="/about"
            className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/75"
          >
            Learn why I built this
          </Link>
        </p>
      </div>

      <ActiveDiscussions />

      <div className="min-w-0">
        <MessagesTable2 />
      </div>
    </section>
  )
}
