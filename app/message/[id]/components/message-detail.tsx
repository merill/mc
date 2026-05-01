import { getMessageData, getMessageSource, getMessageSummary } from "@/lib/messages"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import InfoCards from "@/app/message/[id]/components/info-cards";
import { MessageSource } from "@/types/message";

export default function MessageDetail(props: { id: string }) {
    const msg = getMessageData(props.id);
    const summary = getMessageSummary(msg);
    const contentTitle = getMessageSource(msg) === MessageSource.Roadmap ? "Description" : "More information";
    return (
        <div className="flex flex-col items-start gap-5 pt-5">
            <InfoCards id={props.id} />
            {(summary && 
            <Card className="overflow-hidden rounded-[0.5rem] border bg-background bg-slate-100 dark:bg-slate-700 shadow-md md:shadow-md" >
                <CardHeader>
                    <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg">
                        {getMessageSummary(msg)}
                    </p>
                </CardContent>
            </Card>
            )}            

            <Card className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-md">
                <CardHeader>
                    <CardTitle>{contentTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="message-content space-y-4 text-lg" dangerouslySetInnerHTML={{ __html: msg?.Body?.Content || '' }} />
                </CardContent>
            </Card>
        </div>
    )
}
