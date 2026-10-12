"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, X } from "lucide-react"

// Change the key when the announcement changes, so it shows again to people
// who dismissed the last one.
const DISMISSED_KEY = "mc-announcement-discuss"

/**
 * A thin strip above the header announcing that posts can now be liked and
 * commented on, linking to the page that explains it. Dismissing it is
 * remembered in this browser.
 */
export function AnnouncementBar() {
  const [dismissed, setDismissed] = React.useState(false)

  React.useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1")
    } catch {
      // Without storage it simply shows on every page.
    }
  }, [])

  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, "1")
    } catch {
      // It stays away for this page only.
    }
  }

  return (
    <div className="border-b border-amber-400/70 bg-amber-300 text-amber-950 dark:border-amber-500/40 dark:bg-amber-400">
      <div className="container flex min-h-9 items-center gap-2 py-1.5 text-sm">
        <Link
          href="/discuss"
          className="group flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center"
        >
          <span className="rounded-full bg-amber-950 px-2 py-px text-xs font-semibold uppercase tracking-wide text-amber-100">
            New
          </span>
          <span className="font-medium">
            You can now like and comment on Message Center posts.
          </span>
          <span className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 group-hover:no-underline">
            See how it works
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this announcement"
          className="flex size-7 shrink-0 items-center justify-center rounded-md opacity-70 hover:bg-amber-950/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-950"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
