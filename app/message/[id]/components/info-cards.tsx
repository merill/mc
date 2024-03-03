import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { getFormattedDate, getMessageData, getMessageRoadmapID } from "@/lib/messages";
import { Message } from "@/types/message"

export default function InfoCards(props: { id: string }) {
    const msg = getMessageData(props.id);
    const datePublished = getFormattedDate(msg?.StartDateTime)
    const dateActBy = getFormattedDate(msg?.ActionRequiredByDateTime)
    const dateUpdated = getFormattedDate(msg?.LastModifiedDateTime)

    const dateTitle = datePublished === dateUpdated ? "Published" : "Last Updated"
    const dateSubtitle = datePublished === dateUpdated ? "" : "Published " + datePublished

    const roadmapId = getMessageRoadmapID(msg);

    return (
        <div className="space-y-4 w-full">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">


                <a href={`https://admin.microsoft.com/#/MessageCenter/:/messages/${msg?.Id}`} target="_blank" rel="noopener">
                    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Message ID
                            </CardTitle>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                className="h-4 w-4 text-muted-foreground"
                            >
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{msg?.Id}</div>
                            <p className="text-xs text-muted-foreground">
                            </p>
                        </CardContent>
                    </Card>
                </a>

                <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {dateTitle}
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dateUpdated}</div>
                        <p className="text-xs text-muted-foreground">
                            {dateSubtitle}
                        </p>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Service</CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <rect width="20" height="14" x="2" y="5" rx="2" />
                            <path d="M2 10h20" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0.5">
                            {msg?.Services?.map((service) => (
                                <Badge key={service}>
                                    <div className="text-nowrap">
                                        {service}
                                    </div>
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Tag
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0.5">
                            {msg?.IsMajorChange && (
                                <Badge variant="destructive">
                                    <div className="text-nowrap">
                                        Major change
                                    </div>
                                </Badge>
                            )}
                            {msg?.Tags?.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                    <div className="text-nowrap">
                                        {tag}
                                    </div>
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                {roadmapId && (
                    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Roadmap ID
                            </CardTitle>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                className="h-4 w-4 text-muted-foreground"
                            >
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        </CardHeader>
                        <CardContent>
                            <a href={`https://www.microsoft.com/en-US/microsoft-365/roadmap?filters=&searchterms=${roadmapId}`} target="_blank" rel="noopener" ><div className="text-2xl font-bold">{roadmapId}</div></a>
                            <p className="text-xs text-muted-foreground">
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}