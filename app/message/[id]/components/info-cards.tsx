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

import { getFormattedDate, getMessageData, getMessagePlatforms, getMessageRoadmapID } from "@/lib/messages";
import { Message } from "@/types/message"
import { Calendar, CalendarClock, MessageSquare, MonitorSmartphone, Tag, WindIcon } from "lucide-react";
import { platform } from "os";

export default function InfoCards(props: { id: string }) {
    const msg = getMessageData(props.id);
    const datePublished = getFormattedDate(msg?.StartDateTime)
    const dateActBy = getFormattedDate(msg?.ActionRequiredByDateTime)
    const dateUpdated = getFormattedDate(msg?.LastModifiedDateTime)

    const dateTitle = datePublished === dateUpdated ? "Published" : "Last Updated"
    const dateSubtitle = datePublished === dateUpdated ? "" : "Published " + datePublished

    const roadmapId = getMessageRoadmapID(msg);
    const platforms = getMessagePlatforms(msg);

    return (
        <div className="space-y-4 w-full">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">


                <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                    <a href={`https://admin.microsoft.com/#/MessageCenter/:/messages/${msg?.Id}`} target="_blank" rel="noopener">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Message ID
                            </CardTitle>
                            <MessageSquare size={20} color="gray" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{msg?.Id}</div>
                            <p className="text-xs text-muted-foreground">
                            </p>
                        </CardContent>
                    </a>
                </Card>


                <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {dateTitle}
                        </CardTitle>
                        <Calendar size={20} color="gray" />
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-app-window"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M10 4v4" /><path d="M2 8h20" /><path d="M6 4v4" /></svg>
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
                        <CardTitle className="text-sm font-medium">Tag</CardTitle>
                        <Tag size={20} color="#757575" />
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
                        <a href={`https://www.microsoft.com/en-US/microsoft-365/roadmap?filters=&searchterms=${roadmapId}`} target="_blank" rel="noopener" >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Roadmap ID
                                </CardTitle>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-route"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></svg>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{roadmapId}</div>
                                <p className="text-xs text-muted-foreground">
                                </p>
                            </CardContent>
                        </a>
                    </Card>
                )}
                {dateActBy && (
                    <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Act by
                            </CardTitle>
                            <CalendarClock size={20} color="gray" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dateActBy}</div>
                            <p className="text-xs text-muted-foreground">
                            </p>
                        </CardContent>
                    </Card>
                )}
                {platforms && (
                <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Platforms</CardTitle>
                        <MonitorSmartphone size={20} color="#757575" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-0.5">
                            {platforms.split(",").map((platform) => (
                                <Badge variant="secondary">
                                    <div className="text-nowrap">
                                        {platform}
                                    </div>
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                )}
            </div>
        </div>
    )
}