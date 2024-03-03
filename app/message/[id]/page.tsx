import { Metadata, ResolvingMetadata } from "next"
import { getAllMessageIds } from "@/lib/messages"
import MessageDetail from "@/app/message/[id]/components/message-detail";
import { getMessageData } from "@/lib/messages"

type Props = {
    params: { id: string }
  }

export default function Page({ params }: Props) {

    const msg = getMessageData(params.id);

    return (
        <>
            <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
                <div className="flex flex-col items-start gap-2">
                    <h1 className="text-3xl font-extrabold md:text-4xl">
                        {msg?.Title}</h1>

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
   
    return {
      title: msg?.Id,
    }
  }
  
export async function generateStaticParams() {
    const paths = getAllMessageIds();
    return paths;
}