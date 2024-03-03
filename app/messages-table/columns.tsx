"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

export type MessageView = {
  id: string
  title: string
  service: string[] | undefined
  lastUpdated: string | undefined
  isMajor: boolean
}

export const columns: ColumnDef<MessageView>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <div>ID</div>
      )
    },
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <span className="text-nowrap">{row.original.id}</span>
          {(row.original.isMajor &&
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
    }
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (<div>Title</div>)
    },
    cell: ({ row }) => {
      return (
        <div className="w-full">{row.original.title}</div>
      )
    },
  },
  {
    accessorKey: "service",
    header: ({ column }) => {
      return (
        <div className="text-center">
            Service
        </div>
      )
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
    }
  },
  {
    accessorKey: "lastUpdated",
    header: ({ column }) => {
      return (
        <div className="text-nowrap">
          Last updated
        </div>
      )
    },
    cell: ({ row }) => {
      return (
        <span className="text-nowrap">{row.original.lastUpdated}</span>
      )
    },
  }
]
