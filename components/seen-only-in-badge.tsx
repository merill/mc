"use client"

import { useRef } from "react"

import { getSeenOnlyInLabel } from "@/lib/seen-only-in"
import { cn } from "@/lib/utils"
import { badgeVariants } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Badge for a post only one kind of tenant returned. Clicking it opens a
// dialog that explains what the label means.
export function SeenOnlyInBadge(props: {
  value: string | null | undefined
  compact?: boolean
  className?: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const seenOnlyIn = getSeenOnlyInLabel(props.value)

  if (!seenOnlyIn) return null

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        title={props.compact ? seenOnlyIn.label : undefined}
        onClick={() => dialogRef.current?.showModal()}
        className={cn(
          badgeVariants({ variant: "outline" }),
          "cursor-pointer hover:bg-secondary",
          props.className
        )}
      >
        <span className="text-balance break-words">
          {props.compact ? seenOnlyIn.short : seenOnlyIn.label}
        </span>
      </button>
      <dialog
        ref={dialogRef}
        aria-label={seenOnlyIn.label}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close()
        }}
        // Important, so a parent's space-y margins cannot pull it off centre.
        className="!m-auto w-[calc(100%-2rem)] max-w-md rounded-[0.5rem] border bg-background p-0 text-left text-foreground shadow-lg backdrop:bg-black/50"
      >
        <div className="space-y-3 whitespace-normal p-6">
          <h2 className="text-lg font-semibold">{seenOnlyIn.label}</h2>
          <p className="text-sm font-normal text-muted-foreground">
            {seenOnlyIn.description}
          </p>
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dialogRef.current?.close()}
            >
              Got it
            </Button>
          </div>
        </div>
      </dialog>
    </>
  )
}
