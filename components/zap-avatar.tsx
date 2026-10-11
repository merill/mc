"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { avatarColor, avatarSrc } from "@/lib/zap"

/**
 * A zap.ms member's photo. The monogram on their own colour sits underneath,
 * so it shows for members without a photo and when the photo does not load.
 * Size and letter size come from `className`.
 */
export function ZapAvatar(props: {
  username: string
  src?: string | null
  className?: string
}) {
  const src = avatarSrc(props.src)
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [src])

  return (
    <span
      className={cn(
        "relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold uppercase text-white",
        props.className
      )}
      style={{ backgroundColor: avatarColor(props.username) }}
      aria-hidden="true"
    >
      {props.username.slice(0, 1)}
      {src && !failed && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
