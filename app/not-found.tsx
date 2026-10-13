import { Metadata } from "next"
import Link from "next/link"

import { LegacyHistoryRedirect } from "@/components/legacy-history-redirect"

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <section className="page-shell">
      <LegacyHistoryRedirect />
      <div className="page-intro">
        <h1 className="page-title">Page not found</h1>
        <p className="page-description">
          There is nothing at this address. Posts live at{" "}
          <code>/message/</code> followed by their ID, and the{" "}
          <Link className="readable-link" href="/">
            home page
          </Link>{" "}
          lists and searches all of them.
        </p>
      </div>
    </section>
  )
}
