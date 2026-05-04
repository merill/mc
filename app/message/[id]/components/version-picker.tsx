"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { GitCompare } from "lucide-react"

interface VersionEntry {
  slug: string
  label: string
  isLatest: boolean
}

export default function VersionPicker(props: {
  id: string
  versions: VersionEntry[]
  latestSlug: string
}) {
  // Default: compare second-latest -> latest.
  const initialFrom = props.versions[1]?.slug ?? props.versions[0]?.slug
  const initialTo = props.versions[0]?.slug
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const router = useRouter()

  const onCompare = () => {
    if (!from || !to || from === to) return
    router.push(`/message/${props.id}/compare/${from}/${to}`)
  }

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="mb-2 text-sm font-medium text-foreground">
        Compare any two versions
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>From</span>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-w-[14rem] rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {props.versions.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.label}
                {v.isLatest ? " (latest)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>To</span>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-w-[14rem] rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {props.versions.map((v) => (
              <option key={v.slug} value={v.slug}>
                {v.label}
                {v.isLatest ? " (latest)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onCompare}
          disabled={!from || !to || from === to}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3 text-sm font-medium text-background shadow hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GitCompare size={14} />
          Compare
        </button>
      </div>
    </div>
  )
}
