"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Inbox, Milestone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type MessageView = {
  id: string
  title: string
  service: string[] | undefined
  lastUpdated: string | undefined
  isMajor: boolean
  isArchived: boolean
  source: "messageCenter" | "roadmap"
  sourceLabel: string
}

export const columns: ColumnDef<MessageView>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return <div>ID</div>
    },
    cell: ({ row }) => {
      const SourceIcon = row.original.source === "roadmap" ? Milestone : Inbox

      return (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex text-muted-foreground">
                  <SourceIcon size={16} aria-label={row.original.sourceLabel} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{row.original.sourceLabel}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-nowrap font-medium text-foreground/85">
            {row.original.id}
          </span>
          {row.original.isArchived && (
            <Badge
              variant="outline"
              className="text-nowrap text-xs text-muted-foreground"
            >
              Expired
            </Badge>
          )}
          {row.original.isMajor && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex h-2 w-2 rounded-full bg-red-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Major change</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return <div>Title</div>
    },
    cell: ({ row }) => {
      return (
        <div className="w-full whitespace-normal break-words leading-7 text-foreground/90">
          {row.original.title}
        </div>
      )
    },
  },
  {
    accessorKey: "service",
    header: ({ column }) => {
      return <div className="text-center">Service</div>
    },
    cell: ({ row }) => {
      return (
        <div className="space-y-0.5 text-center">
          {row.original.service?.map((service) => (
            <Badge key={service} variant="secondary" className="text-nowrap">
              {service}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "lastUpdated",
    header: ({ column }) => {
      return <div className="text-nowrap">Last updated</div>
    },
    cell: ({ row }) => {
      return (
        <span className="text-nowrap text-foreground/75">
          {row.original.lastUpdated}
        </span>
      )
    },
  },
]
