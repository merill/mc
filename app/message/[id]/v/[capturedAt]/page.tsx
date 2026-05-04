import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, GitCompare, History } from "lucide-react"

import {
  getAllVersionParams,
  getFormattedDate,
  getMessageHistory,
  getMessageSourceLabel,
  getMessageVersion,
  linkifyMcIds,
  slugifyCapturedAt,
} from "@/lib/messages"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import BodyDiff from "@/app/message/[id]/components/body-diff"
import MessageContent from "@/app/message/[id]/components/message-content"

type Props = {
  params: Promise<{ id: string; capturedAt: string }>
}

export const dynamicParams = false

export async function generateStaticParams() {
  return getAllVersionParams()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, capturedAt } = await params
  return {
    title: `${id} — historical version`,
    robots: { index: false, follow: true },
    alternates: { canonical: `/message/${id}` },
    openGraph: {
      title: `${id} — historical version`,
      url: `/message/${id}/v/${capturedAt}`,
    },
  }
}

export default async function VersionPage({ params }: Props) {
  const { id, capturedAt } = await params
  const history = getMessageHistory(id)
  const version = getMessageVersion(id, capturedAt)
  if (!history || !version) notFound()

  const latest = history.versions[history.versions.length - 1]
  const isLatest = version.capturedAt === latest.capturedAt
  const latestSlug = slugifyCapturedAt(latest.capturedAt)
  const versionSlug = slugifyCapturedAt(version.capturedAt)
  const sourceLabel = getMessageSourceLabel(version.message)

  return (
    <section className="page-shell min-w-0">
      <div className="flex min-w-0 flex-col items-start gap-3">
        <Link
          href={`/message/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200"
        >
          <ArrowLeft size={14} /> Back to latest version
        </Link>

        <div className="w-full rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <div className="flex flex-wrap items-center gap-2">
            <History size={16} />
            <span>
              You&apos;re viewing a historical snapshot from{" "}
              <strong>{getFormattedDate(version.capturedAt)}</strong>.
              {isLatest ? null : (
                <>
                  {" "}
                  This is not the latest version.
                </>
              )}
            </span>
          </div>
          {!isLatest && (
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                href={`/message/${id}`}
                className="font-medium underline underline-offset-4"
              >
                View the latest version
              </Link>
              <Link
                href={`/message/${id}/compare/${versionSlug}/${latestSlug}`}
                className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
              >
                <GitCompare size={14} /> See what changed since this
                version
              </Link>
            </div>
          )}
        </div>

        <h1 className="max-w-6xl break-words text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl md:leading-tight">
          {version.message.Id} - {version.message.Title}
        </h1>
        <p className="text-lg font-medium leading-8 text-foreground/75 md:text-xl">
          {sourceLabel}
        </p>

        {!isLatest && (
          <div className="w-full pt-4">
            <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm">
              <CardHeader>
                <CardTitle>What changed since this version</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="diff-del">removed text</span>
                  <span className="diff-ins">added text</span>
                </div>
                <BodyDiff
                  oldHtml={version.message.Body?.Content || ""}
                  newHtml={latest.message.Body?.Content || ""}
                  currentId={id}
                />
              </CardContent>
            </Card>
          </div>
        )}

        <div className="w-full pt-4">
          <Card className="w-full overflow-hidden rounded-[0.5rem] border bg-background shadow-sm md:shadow-sm">
            <CardHeader>
              <CardTitle>
                Snapshot from {getFormattedDate(version.capturedAt)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MessageContent
                html={linkifyMcIds(version.message.Body?.Content || "", id)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
