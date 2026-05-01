import { Metadata, ResolvingMetadata } from "next"
import { getAllMessageIds, getMessageSourceLabel, getMessageSummary } from "@/lib/messages"
import MessageDetail from "@/app/message/[id]/components/message-detail";
import { getMessageData } from "@/lib/messages"

type Props = {
    params: { id: string }
  }

export default function Page({ params }: Props) {

    const msg = getMessageData(params.id);

    return (
        <>
            <section className="container grid min-w-0 items-center gap-6 pb-8 pt-6 md:py-10">
                <div className="flex min-w-0 flex-col items-start gap-2">
                    <h1 className="max-w-full break-words text-2xl font-extrabold leading-tight md:text-4xl">
                    {msg?.Id} - {msg?.Title}</h1>
                    <p className="text-base text-muted-foreground md:text-lg">
                      {getMessageSourceLabel(msg)}
                    </p>

                        <MessageDetail id={params.id} />

                </div>
            </section >
        </>
    )
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
  ): Promise<Metadata> {
    const msg = getMessageData(params.id);
    //get message summary if summary is empty the return detail
    var summary = getMessageSummary(msg);
    if(summary === ""){
      summary = msg?.Body?.Content || "";
    }

    return {
      title: msg?.Id + " - " + msg?.Title,
      description: summary
    }
  }
  
export async function generateStaticParams() {
    const paths = getAllMessageIds();
    return paths;
}
