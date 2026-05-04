"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { GitCompare } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">From</span>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="min-w-[14rem]">
              <SelectValue placeholder="Select a version" />
            </SelectTrigger>
            <SelectContent>
              {props.versions.map((v) => (
                <SelectItem key={v.slug} value={v.slug}>
                  {v.label}
                  {v.isLatest ? " (latest)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">To</span>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="min-w-[14rem]">
              <SelectValue placeholder="Select a version" />
            </SelectTrigger>
            <SelectContent>
              {props.versions.map((v) => (
                <SelectItem key={v.slug} value={v.slug}>
                  {v.label}
                  {v.isLatest ? " (latest)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={onCompare}
          disabled={!from || !to || from === to}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GitCompare size={14} />
          Compare
        </button>
      </div>
    </div>
  )
}
