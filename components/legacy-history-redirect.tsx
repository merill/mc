"use client"

import * as React from "react"

import { legacyHistoryRedirect } from "@/lib/history"

/**
 * Sends an address from when every version had a page of its own to the same
 * version on the post's page. Lives on the not-found page, which is what the
 * host serves for those addresses now. Renders nothing.
 */
export function LegacyHistoryRedirect() {
  React.useEffect(() => {
    const target = legacyHistoryRedirect(window.location.pathname)
    if (target) window.location.replace(target)
  }, [])

  return null
}
