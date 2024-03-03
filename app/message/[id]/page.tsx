import { Metadata } from "next"
import { getAllMessageIds } from "@/lib/messages"
import MessageDetail from "@/components/message-detail";
import { getMessageData } from "@/lib/messages"

export default function Page({ params }: { params: { id: string } }) {

    const msg = getMessageData(params.id);

    return (
        <>
            <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
                <div className="flex flex-col items-start gap-2">
                    <h1 className="text-3xl font-extrabold md:text-4xl">
                        {msg?.Id} - {msg?.Title}</h1>

                        <MessageDetail id={params.id} />

                </div>
            </section >
        </>
    )
}

export async function generateStaticParams() {
    const paths = getAllMessageIds();
    return paths;
}