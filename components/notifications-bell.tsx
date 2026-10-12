"use client"

import * as React from "react"
import { Bell } from "lucide-react"

import { useZapSession } from "@/lib/use-discussion"
import { cn } from "@/lib/utils"
import { unreadBadge } from "@/lib/zap"
import { buttonVariants } from "@/components/ui/button"

/**
 * The header's bell: a link to the signed-in person's notifications on
 * zap.ms, with a count while some are unread. Renders nothing when signed out
 * and nothing against a zap.ms that does not send the link yet.
 */
export function NotificationsBell() {
  const { session } = useZapSession()
  if (session.status !== "signed-in" || !session.notificationsUrl) return null

  const badge = unreadBadge(session.unread)

  return (
    <a
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative"
      )}
      href={session.notificationsUrl}
      aria-label={badge.label}
      title={badge.label}
    >
      <Bell className="size-5" aria-hidden="true" />
      {session.unread > 0 && (
        <span
          className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[0.625rem] font-semibold leading-none text-white"
          aria-hidden="true"
        >
          {badge.text}
        </span>
      )}
    </a>
  )
}
