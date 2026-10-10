"use client"

import * as React from "react"

import { siteConfig } from "@/config/site"
import { useZapSession } from "@/lib/use-discussion"
import { cn } from "@/lib/utils"
import { avatarColor, zapLinks } from "@/lib/zap"
import { buttonVariants } from "@/components/ui/button"

/**
 * The header's sign-in button, or the signed-in person with a small menu.
 * Renders nothing until zap.ms has answered, and nothing at all where its
 * /zap path is missing (local development), so the header never jumps to a
 * button that cannot work.
 */
export function AccountMenu() {
  const { session, signIn, signOut } = useZapSession()
  const menu = React.useRef<HTMLDetailsElement>(null)

  // A click elsewhere, or Escape, closes the menu.
  React.useEffect(() => {
    const close = (event: Event) => {
      const open = menu.current?.open
      if (!open) return
      if (event instanceof KeyboardEvent && event.key !== "Escape") return
      if (
        event instanceof MouseEvent &&
        menu.current?.contains(event.target as Node)
      ) {
        return
      }
      menu.current?.removeAttribute("open")
    }
    document.addEventListener("click", close)
    document.addEventListener("keydown", close)
    return () => {
      document.removeEventListener("click", close)
      document.removeEventListener("keydown", close)
    }
  }, [])

  if (session.status === "signed-out") {
    return (
      <button
        type="button"
        className={buttonVariants({ variant: "outline", size: "sm" })}
        onClick={signIn}
      >
        Sign in
      </button>
    )
  }
  if (session.status !== "signed-in") return null

  const { username } = session
  const item =
    "block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"

  return (
    <details ref={menu} className="relative">
      <summary
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "cursor-pointer list-none gap-2 px-2 [&::-webkit-details-marker]:hidden"
        )}
        aria-label={`Signed in as ${username}. Account menu`}
      >
        <span
          className="flex size-6 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
          style={{ backgroundColor: avatarColor(username) }}
          aria-hidden="true"
        >
          {username.slice(0, 1)}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{username}</span>
      </summary>
      <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">
          Signed in as {username}
        </p>
        <a
          className={item}
          href={zapLinks(siteConfig.zap.url, "").user(username)}
        >
          Your profile on zap.ms
        </a>
        <button type="button" className={item} onClick={signOut}>
          Sign out
        </button>
      </div>
    </details>
  )
}
