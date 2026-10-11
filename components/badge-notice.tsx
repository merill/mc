"use client"

import * as React from "react"

import { useZapSession } from "@/lib/use-discussion"
import { cn } from "@/lib/utils"
import { badgeNoticeText } from "@/lib/zap"
import { buttonVariants } from "@/components/ui/button"

/**
 * A strip under the header for a signed-in zap.ms member whose Microsoft badge
 * needs renewing or has been removed. Verifying happens on zap.ms.
 */
export function BadgeNotice() {
  const { session, dismissBadgeNotice } = useZapSession()
  const notice = session.status === "signed-in" ? session.badgeNotice : null
  if (!notice) return null

  const action =
    "h-8 border-amber-400 hover:bg-amber-100 hover:text-amber-950 dark:border-amber-600 dark:hover:bg-amber-900 dark:hover:text-amber-50"

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <div className="container flex flex-wrap items-center justify-center gap-x-3 gap-y-2 py-2">
        <span>{badgeNoticeText(notice)}</span>
        <span className="flex items-center gap-1.5">
          <a
            href={notice.verifyUrl}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              action
            )}
          >
            Verify
          </a>
          {notice.state === "removed" && (
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                action,
                "border-transparent dark:border-transparent"
              )}
              onClick={dismissBadgeNotice}
            >
              Dismiss
            </button>
          )}
        </span>
      </div>
    </div>
  )
}
