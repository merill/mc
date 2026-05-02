import { getFormattedDate, getMessageData, getMessageDetailValue, getMessagePlatforms, getMessageRoadmapID, getMessageSource } from "@/lib/messages";
import { Calendar, CalendarClock, Cloud, ExternalLink, Flag, Layers, MessageSquare, MonitorSmartphone, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { MessageSource } from "@/types/message";

export default function InfoCards(props: { id: string }) {
    const msg = getMessageData(props.id);
    const datePublished = getFormattedDate(msg?.StartDateTime)
    const dateActBy = getFormattedDate(msg?.ActionRequiredByDateTime)
    const dateUpdated = getFormattedDate(msg?.LastModifiedDateTime)

    const dateTitle = datePublished === dateUpdated ? "Published" : "Last Updated"
    const dateSubtitle = datePublished === dateUpdated ? "" : "Published " + datePublished

    const roadmapId = getMessageRoadmapID(msg);
    const platforms = getMessagePlatforms(msg);
    const source = getMessageSource(msg);
    const sourceId = getMessageDetailValue(msg, "SourceId") || msg?.Id;
    const roadmapLink = getMessageDetailValue(msg, "RoadmapLink") || `https://www.microsoft.com/en-US/microsoft-365/roadmap?filters=&searchterms=${roadmapId}`;
    const status = getMessageDetailValue(msg, "Status");
    const releasePhase = getMessageDetailValue(msg, "ReleasePhase");
    const clouds = getMessageDetailValue(msg, "CloudInstances");
    const isRoadmap = source === MessageSource.Roadmap;
    const isExpired = !isRoadmap && msg?.EndDateTime ? new Date(msg.EndDateTime) < new Date() : false;
    const dateExpired = getFormattedDate(msg?.EndDateTime);
    const expiredBanner = isExpired && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <CalendarClock size={16} />
            <span>This announcement expired on <strong>{dateExpired}</strong> and is no longer active in Message Center.</span>
        </div>
    );

    const idCard = (
        <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
            <a href={isRoadmap ? roadmapLink : `https://admin.microsoft.com/#/MessageCenter/:/messages/${msg?.Id}`} target="_blank" rel="noopener">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex gap-1">
                        {isRoadmap ? "Roadmap ID" : "Message ID"} <ExternalLink size={10} color="gray" />
                    </CardTitle>
                    {isRoadmap ? <Flag size={20} color="gray" /> : <MessageSquare size={20} color="gray" />}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold flex">{sourceId} </div>
                    <p className="text-xs text-muted-foreground">{isRoadmap ? "View in M365 Roadmap" : "View in Message Center"}</p>
                </CardContent>
            </a>
        </Card>
    );

    const serviceCard = (
        <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Service</CardTitle>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-app-window"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M10 4v4" /><path d="M2 8h20" /><path d="M6 4v4" /></svg>
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
    );

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
                            <div className="text-nowrap">
                                {value.trim()}
                            </div>
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

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
                            <div className="text-nowrap">
                                {value.trim()}
                            </div>
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

    const dateCard = (
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
    );

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
    );

    const roadmapCard = roadmapId && !isRoadmap && (
        <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
            <a href={roadmapLink} target="_blank" rel="noopener" >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex gap-1">
                        Roadmap ID <ExternalLink size={10} color="gray" />
                    </CardTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-route"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></svg>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{roadmapId}</div>
                    <p className="text-xs text-muted-foreground">View in M365 Roadmap</p>
                </CardContent>
            </a>
        </Card>
    );

    const actByCard = dateActBy && (
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
    );

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
                            <div className="text-nowrap">
                                {platform}
                            </div>
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

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
                            <div className="text-nowrap">
                                {cloud.trim()}
                            </div>
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

    if (isRoadmap) {
        return (
            <div className="space-y-4 w-full">
                {expiredBanner}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {idCard}
                    {statusCard}
                    {releaseCard}
                    {dateCard}
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
        <div className="space-y-4 w-full">
            {expiredBanner}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {idCard}
                {serviceCard}
                {statusCard}
                {releaseCard}
                {dateCard}
                {tagCard}
                {roadmapCard}
                {actByCard}
                {platformsCard}
                {cloudCard}
            </div>
        </div>
    )
}
