"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface LightboxState {
  src: string
  alt: string
}

export default function MessageContent({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Attach a delegated click handler so injected (dangerouslySetInnerHTML) <img>
  // tags can open in a fullscreen overlay.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const imgs = Array.from(container.querySelectorAll("img"))
    imgs.forEach((img) => {
      img.classList.add("message-content-img")
      // Make it accessible as a button.
      img.setAttribute("role", "button")
      img.setAttribute("tabindex", "0")
      if (!img.getAttribute("alt")) img.setAttribute("alt", "Embedded image")
    })

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const img = target.closest("img") as HTMLImageElement | null
      if (!img || !container.contains(img)) return
      e.preventDefault()
      setLightbox({
        src: img.currentSrc || img.src,
        alt: img.alt || "Embedded image",
      })
    }

    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || target.tagName !== "IMG") return
      if (e.key === "Enter" || e.key === " ") {
        const img = target as HTMLImageElement
        e.preventDefault()
        setLightbox({
          src: img.currentSrc || img.src,
          alt: img.alt || "Embedded image",
        })
      }
    }

    container.addEventListener("click", handleClick)
    container.addEventListener("keydown", handleKey)
    return () => {
      container.removeEventListener("click", handleClick)
      container.removeEventListener("keydown", handleKey)
    }
  }, [html])

  const close = useCallback(() => setLightbox(null), [])

  // Close on Escape, lock body scroll while open.
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [lightbox, close])

  return (
    <>
      <div
        ref={containerRef}
        className="message-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {mounted && lightbox
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Image preview"
              onClick={close}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            >
              <button
                type="button"
                onClick={close}
                aria-label="Close image preview"
                className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Close (Esc)
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.src}
                alt={lightbox.alt}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[95vh] max-w-[95vw] cursor-default rounded-md object-contain shadow-2xl"
              />
            </div>,
            document.body
          )
        : null}
    </>
  )
}
