import { getMessageData, getMessageSummary } from "@/lib/messages"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import InfoCards from "@/app/message/[id]/components/info-cards";

export default function MessageDetail(props: { id: string }) {
    const msg = getMessageData(props.id);
    const summary = getMessageSummary(msg);
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
                    <CardTitle>More information</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg">
                        <div className="space-y-4" dangerouslySetInnerHTML={{ __html: msg?.Body?.Content || '' }} />
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}