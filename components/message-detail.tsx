'use client'
import { getMessageData, getMessageSummary } from "@/lib/messages"
import { Separator } from "@/components/ui/separator"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default function MessageDetail(props : {id: string}) {
    const msg = getMessageData(props.id);

    return (
        <>
            msg && <div className="overflow-hidden rounded-[0.5rem] border bg-background shadow-md md:shadow-xl">
                <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
                    <div className="flex flex-col items-start gap-2">
                        <h1 className="text-3xl font-extrabold md:text-4xl">
                            {msg?.Id} - {msg?.Title}</h1>
                        <Separator />
                        <h2 className="text-3xl font-extrabold md:text-4xl pt-4">
                        </h2>
                        <Card>
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-lg">
                                    {getMessageSummary(msg)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>More information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg">
                                <div className="space-y-4" dangerouslySetInnerHTML={{ __html: msg?.Body?.Content || '' }} />
                            </p>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </>
    )
}