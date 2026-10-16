import tableServices from "@/@data/table-services.json"

import {
  getAllMessages,
  getFormattedDate,
  getMessageSource,
  getMessageSourceLabel,
} from "@/lib/messages"
import { MessageView, columns } from "@/app/messages-table/columns"
import { DataTable } from "@/app/messages-table/data-table"

// ISO day used for sorting; the display string cannot be sorted meaningfully.
function toIsoDay(value: string | undefined | null): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString().slice(0, 10)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whether Microsoft changed a post more than a day after publishing it. */
export function changedSince(
  start: string | undefined | null,
  modified: string | undefined | null
): boolean {
  if (!start || !modified) return false
  return new Date(modified).getTime() - new Date(start).getTime() > DAY_MS
}

function getData(): MessageView[] {
  const dataMessages = getAllMessages()

  return dataMessages.map(
    (item): MessageView => ({
      id: item.Id,
      title: item.Title,
      service: item.Services,
      lastUpdated: getFormattedDate(item.LastModifiedDateTime),
      date: toIsoDay(item.LastModifiedDateTime),
      published: changedSince(item.StartDateTime, item.LastModifiedDateTime)
        ? getFormattedDate(item.StartDateTime)
        : undefined,
      isMajor: item.IsMajorChange ?? false,
      isArchived: false,
      seenOnlyIn: item.SeenOnlyIn,
      source: getMessageSource(item),
      sourceLabel: getMessageSourceLabel(item),
    })
  )
}

export default function MessagesTable2() {
  const data = getData()

  return (
    <div className="">
      <DataTable
        columns={columns}
        data={data}
        archiveUrl="/messages-archive.json"
        services={tableServices}
      />
    </div>
  )
}
