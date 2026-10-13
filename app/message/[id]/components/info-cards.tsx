import Link from "next/link"
import {
  Calendar,
  CalendarClock,
  Cloud,
  ExternalLink,
  Flag,
  History,
  Layers,
  Link2,
  MessageSquare,
  MonitorSmartphone,
  Tag,
} from "lucide-react"

import { MessageSource } from "@/types/message"
import {
  getFormattedDate,
  getMessageData,
  getMessageDetailValue,
  getMessagePlatforms,
  getMessageRoadmapID,
  getMessageReferencedBy,
  getMessageReferences,
  getMessageSource,
  hasMultipleVersions,
} from "@/lib/messages"
import { SeenOnlyInBadge } from "@/components/seen-only-in-badge"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ExpiredBanner(props: { id: string }) {
  const msg = getMessageData(props.id)
  const source = getMessageSource(msg)
  const isRoadmap = source === MessageSource.Roadmap
  const isExpired =
    !isRoadmap && msg?.EndDateTime
      ? new Date(msg.EndDateTime) < new Date()
      : false
  if (!isExpired) return null
  const dateExpired = getFormattedDate(msg?.EndDateTime)
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      <CalendarClock size={16} />
      <span>
        This announcement expired on <strong>{dateExpired}</strong> and is no
        longer active in Message Center.
      </span>
    </div>
  )
}

type InfoCardsLayout = "grid" | "stack"

export default function InfoCards(props: {
  id: string
  layout?: InfoCardsLayout
  showHistoryLink?: boolean
}) {
  const layout: InfoCardsLayout = props.layout ?? "grid"
  const showHistoryLink = props.showHistoryLink ?? false
  const msg = getMessageData(props.id)
  const hasHistory = hasMultipleVersions(props.id)
  const referenceIds = Array.from(
    new Set([
      ...getMessageReferences(props.id),
      ...getMessageReferencedBy(props.id),
    ])
  )
  const RELATED_CAP = 8
  const relatedCapped = referenceIds.slice(0, RELATED_CAP)
  const datePublished = getFormattedDate(msg?.StartDateTime)
  const dateActBy = getFormattedDate(msg?.ActionRequiredByDateTime)
  const dateUpdated = getFormattedDate(msg?.LastModifiedDateTime)

  const dateTitle = datePublished === dateUpdated ? "Published" : "Last Updated"
  const dateSubtitle =
    datePublished === dateUpdated ? "" : "Published " + datePublished

  const roadmapId = getMessageRoadmapID(msg)
  const platforms = getMessagePlatforms(msg)
  const source = getMessageSource(msg)
  const sourceId = getMessageDetailValue(msg, "SourceId") || msg?.Id
  const externalRoadmapLink =
    getMessageDetailValue(msg, "RoadmapLink") ||
    `https://www.microsoft.com/en-US/microsoft-365/roadmap?filters=&searchterms=${roadmapId}`
  // If we have an internal roadmap detail page for this id, link there.
  // The detail Id format is `RM<numeric>`; the RoadmapIds detail value on MC
  // posts is just the numeric portion.
  const internalRoadmapId = roadmapId ? `RM${roadmapId}` : ""
  const internalRoadmapExists = internalRoadmapId
    ? Boolean(getMessageData(internalRoadmapId))
    : false
  const roadmapLink = externalRoadmapLink
  const status = getMessageDetailValue(msg, "Status")
  const releasePhase = getMessageDetailValue(msg, "ReleasePhase")
  const clouds = getMessageDetailValue(msg, "CloudInstances")
  const isRoadmap = source === MessageSource.Roadmap
  const isAzure = source === MessageSource.Azure
  const availability = getMessageDetailValue(msg, "Availability")
  const productCategories = getMessageDetailValue(msg, "ProductCategories")

  // Where the post lives on Microsoft's side, and what its id is called there.
  const origin = isRoadmap
    ? {
        href: roadmapLink,
        title: "Roadmap ID",
        value: sourceId,
        action: "View in M365 Roadmap",
        Icon: Flag,
      }
    : isAzure
    ? {
        href: getMessageDetailValue(msg, "AzureLink"),
        // Microsoft names updates from before November 2024 with a slug that
        // repeats the title, so there is no id worth showing.
        title: msg?.Id.startsWith("AZ-") ? "Source" : "Azure update ID",
        value: msg?.Id.startsWith("AZ-") ? "Azure Updates" : sourceId,
        action: "View in Azure Updates",
        Icon: Cloud,
      }
    : {
        href: `https://admin.microsoft.com/#/MessageCenter/:/messages/${msg?.Id}`,
        title: "Message ID",
        value: sourceId,
        action: "View in Message Center",
        Icon: MessageSquare,
      }

  const idCard = (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <a href={origin.href} target="_blank" rel="noopener">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex gap-1">
            {origin.title} <ExternalLink size={10} color="gray" />
          </CardTitle>
          <origin.Icon size={20} color="gray" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex">{origin.value} </div>
          <p className="text-xs text-muted-foreground">{origin.action}</p>
        </CardContent>
      </a>
    </Card>
  )

  const serviceCard = (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {isAzure ? "Product" : "Service"}
        </CardTitle>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#808080"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-app-window"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M10 4v4" />
          <path d="M2 8h20" />
          <path d="M6 4v4" />
        </svg>
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {msg?.Services?.map((service) => (
            <Badge key={service}>
              <div className="text-balance break-words">{service}</div>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const statusCard = status && (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Status</CardTitle>
        <Flag size={20} color="#757575" />
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {status.split(",").map((value) => (
            <Badge key={value.trim()} variant="secondary">
              <div className="text-balance break-words">{value.trim()}</div>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const releaseCard = releasePhase && (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Release</CardTitle>
        <Layers size={20} color="#757575" />
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {releasePhase.split(",").map((value) => (
            <Badge key={value.trim()} variant="outline">
              <div className="text-balance break-words">{value.trim()}</div>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const dateCard = (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{dateTitle}</CardTitle>
        <Calendar size={20} color="gray" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{dateUpdated}</div>
        <p className="text-xs text-muted-foreground">{dateSubtitle}</p>
        {hasHistory && showHistoryLink && (
          <a
            href="#version-history"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
          >
            <History size={12} />
            View version history
          </a>
        )}
      </CardContent>
    </Card>
  )

  const tagCard = (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Tag</CardTitle>
        <Tag size={20} color="#757575" />
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {msg?.IsMajorChange && (
            <Badge variant="destructive">
              <div className="text-balance break-words">Major change</div>
            </Badge>
          )}
          {msg?.Tags?.map((tag) => (
            <Badge key={tag} variant="secondary">
              <div className="text-balance break-words">{tag}</div>
            </Badge>
          ))}
          <SeenOnlyInBadge value={msg?.SeenOnlyIn} />
        </div>
      </CardContent>
    </Card>
  )

  const roadmapCardInner = (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex gap-1">
          Roadmap ID{" "}
          {!internalRoadmapExists && <ExternalLink size={10} color="gray" />}
        </CardTitle>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#808080"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-route"
        >
          <circle cx="6" cy="19" r="3" />
          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
          <circle cx="18" cy="5" r="3" />
        </svg>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{roadmapId}</div>
        <p className="text-xs text-muted-foreground">
          {internalRoadmapExists
            ? "View roadmap details"
            : "View in M365 Roadmap"}
        </p>
      </CardContent>
    </>
  )

  const roadmapCard = roadmapId && !isRoadmap && (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      {internalRoadmapExists ? (
        <Link href={`/message/${internalRoadmapId}`}>{roadmapCardInner}</Link>
      ) : (
        <a href={roadmapLink} target="_blank" rel="noopener">
          {roadmapCardInner}
        </a>
      )}
    </Card>
  )

  const actByCard = dateActBy && (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Act by</CardTitle>
        <CalendarClock size={20} color="gray" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{dateActBy}</div>
        <p className="text-xs text-muted-foreground"></p>
      </CardContent>
    </Card>
  )

  const platformsCard = platforms && (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Platforms</CardTitle>
        <MonitorSmartphone size={20} color="#757575" />
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {platforms.split(",").map((platform) => (
            <Badge key={platform.trim()} variant="secondary">
              <div className="text-balance break-words">{platform}</div>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const cloudCard = clouds && (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Cloud</CardTitle>
        <Cloud size={20} color="#757575" />
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {clouds.split(",").map((cloud) => (
            <Badge key={cloud.trim()} variant="secondary">
              <div className="text-balance break-words">{cloud.trim()}</div>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  // An Azure update's milestones, such as "Retirement: October 2027".
  const timelineCard = availability && (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Timeline</CardTitle>
        <CalendarClock size={20} color="gray" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {availability.split(";").map((entry) => {
            const [ring, ...when] = entry.split(":")
            return (
              <li key={entry} className="leading-tight">
                <div className="font-bold">{when.join(":").trim()}</div>
                <div className="text-xs text-muted-foreground">
                  {ring.trim()}
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )

  const categoryCard = productCategories && (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Category</CardTitle>
        <Layers size={20} color="#757575" />
      </CardHeader>
      <CardContent>
        <div className="space-y-0.5">
          {productCategories.split(",").map((category) => (
            <Badge key={category.trim()} variant="secondary">
              <div className="text-balance break-words">{category.trim()}</div>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const relatedCard = relatedCapped.length > 0 && (
    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Related</CardTitle>
        <Link2 size={20} color="#757575" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {relatedCapped.map((rid) => (
            <Link
              key={rid}
              href={`/message/${rid}`}
              className="inline-block"
            >
              <Badge
                variant="secondary"
                className="font-mono hover:bg-muted-foreground/20"
              >
                {rid}
              </Badge>
            </Link>
          ))}
        </div>
        {referenceIds.length > RELATED_CAP && (
          <p className="mt-2 text-xs text-muted-foreground">
            +{referenceIds.length - RELATED_CAP} more below
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (layout === "stack") {
    // Vertical stack used in the desktop sidebar.
    // Order: Last Updated, ID, Service, Tag, Related, Status, Release, then
    // remaining metadata.
    if (isRoadmap) {
      return (
        <div className="flex w-full flex-col gap-4">
          {dateCard}
          {idCard}
          {serviceCard}
          {tagCard}
          {relatedCard}
          {statusCard}
          {releaseCard}
          {platformsCard}
          {cloudCard}
        </div>
      )
    }
    return (
      <div className="flex w-full flex-col gap-4">
        {dateCard}
        {idCard}
        {serviceCard}
        {tagCard}
        {relatedCard}
        {statusCard}
        {releaseCard}
        {roadmapCard}
        {actByCard}
        {platformsCard}
        {cloudCard}
      </div>
    )
  }

  if (isAzure) {
    // The release ring is part of each timeline entry, so it has no card.
    return (
      <div className="w-full space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {idCard}
          {dateCard}
          {statusCard}
          {timelineCard}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(msg?.Services?.length ?? 0) > 0 && serviceCard}
          {tagCard}
          {categoryCard}
        </div>
      </div>
    )
  }

  if (isRoadmap) {
    return (
      <div className="w-full space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {idCard}
          {dateCard}
          {statusCard}
          {releaseCard}
          {platformsCard}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {serviceCard}
          {tagCard}
          {cloudCard}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {idCard}
        {dateCard}
        {serviceCard}
        {tagCard}
        {roadmapCard}
        {platformsCard}
        {statusCard}
        {releaseCard}
        {actByCard}
        {cloudCard}
      </div>
    </div>
  )
}
