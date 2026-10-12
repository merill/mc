"use client"

import * as React from "react"
import Link from "next/link"

import { useZapSession } from "@/lib/use-discussion"
import { buttonVariants } from "@/components/ui/button"

/**
 * The way in: Sign in for someone signed out, and the way to the posts for
 * everyone. The sign-in button waits until zap.ms has said nobody is signed
 * in, so it never flashes up for someone who is.
 */
export function GetStarted() {
  const { session, signIn } = useZapSession()
  return (
    <div className="flex flex-wrap items-center gap-3">
      {session.status === "signed-out" && (
        <button type="button" className={buttonVariants()} onClick={signIn}>
          Sign in to get started
        </button>
      )}
      <Link
        href="/"
        className={buttonVariants({
          variant: session.status === "signed-out" ? "outline" : "default",
        })}
      >
        Browse the latest posts
      </Link>
    </div>
  )
}
