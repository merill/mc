import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowLeftRight, GitCompare } from "lucide-react"

import {
  getAllComparePairs,
  getFormattedDate,
  getMessageHistory,
  getMessageSourceLabel,
  getMessageVersion,
  slugifyCapturedAt,
} from "@/lib/messages"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import BodyDiff from "@/app/message/[id]/components/body-diff"
import MetadataDiff from "@/app/message/[id]/components/metadata-diff"

type Props = {
  params: Promise<{ id: string; from: string; to: string }>
}

export const dynamicParams = false

export async function generateStaticParams() {
  return getAllComparePairs()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `${id} — version comparison`,
    robots: { index: false, follow: true },
    alternates: { canonical: `/message/${id}` },
  }
}

export default async function ComparePage({ params }: Props) {
  const { id, from, to } = await params
  const history = getMessageHistory(id)
  if (!history) notFound()

  const fromVersion = getMessageVersion(id, from)
  const toVersion = getMessageVersion(id, to)
  if (!fromVersion || !toVersion) notFound()

  const latest = history.versions[history.versions.length - 1]
  const isToLatest = toVersion.capturedAt === latest.capturedAt
  const fromDate = getFormattedDate(fromVersion.capturedAt)
  const toDate = getFormattedDate(toVersion.capturedAt)
  const sourceLabel = getMessageSourceLabel(toVersion.message)

  const swapHref = `/message/${id}/compare/${slugifyCapturedAt(
    toVersion.capturedAt
  )}/${slugifyCapturedAt(fromVersion.capturedAt)}`

  return (
    <section className="page-shell min-w-0">
      <div className="flex min-w-0 flex-col items-start gap-3">
        <Link
          href={`/message/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
        >
          <ArrowLeft size={14} /> Back to latest version
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
          <GitCompare size={16} />
          <span>
            Comparing{" "}
            <Link
              href={`/message/${id}/v/${slugifyCapturedAt(
                fromVersion.capturedAt
              )}`}
              className="text-foreground underline underline-offset-4"
            >
              {fromDate}
            </Link>{" "}
            →{" "}
            {isToLatest ? (
              <span className="text-foreground">latest ({toDate})</span>
            ) : (
              <Link
                href={`/message/${id}/v/${slugifyCapturedAt(
                  toVersion.capturedAt
                )}`}
                className="text-foreground underline underline-offset-4"
              >
                {toDate}
              </Link>
            )}
          </span>
          <Link
            href={swapHref}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            <ArrowLeftRight size={12} /> Swap
          </Link>
        </div>

        <h1 className="max-w-6xl break-words text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl md:leading-tight">
          {toVersion.message.Id} - {toVersion.message.Title}
        </h1>
        <p className="text-lg font-medium leading-8 text-foreground/75 md:text-xl">
          {sourceLabel}
        </p>

        <div className="w-full space-y-4 pt-4">
          <MetadataDiff
            oldMessage={fromVersion.message}
            newMessage={toVersion.message}
          />

          <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm">
            <CardHeader>
              <CardTitle>Body changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="diff-del">removed text</span>
                <span className="diff-ins">added text</span>
              </div>
              <BodyDiff
                oldHtml={fromVersion.message.Body?.Content || ""}
                newHtml={toVersion.message.Body?.Content || ""}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
