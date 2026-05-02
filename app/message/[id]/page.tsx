import { Metadata, ResolvingMetadata } from "next"
import { getAllMessageIds, getMessageDescription, getMessageSourceLabel } from "@/lib/messages"
import MessageDetail from "@/app/message/[id]/components/message-detail";
import { getMessageData } from "@/lib/messages"
import { siteConfig } from "@/config/site";

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
    const title = msg ? `${msg.Id} - ${msg.Title}` : params.id;
    const description = getMessageDescription(msg) || siteConfig.description;
    const url = `/message/${params.id}`;
    const sourceLabel = getMessageSourceLabel(msg);
    const tags = [...(msg?.Services || []), ...(msg?.Tags || [])].filter(Boolean);

    return {
      title,
      description,
      alternates: {
        canonical: url,
      },
      openGraph: {
        type: "article",
        url,
        siteName: siteConfig.name,
        title,
        description,
        publishedTime: msg?.StartDateTime,
        modifiedTime: msg?.LastModifiedDateTime,
        section: sourceLabel,
        tags,
        images: [
          {
            url: "/og-default.png",
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        creator: "@merill",
        images: ["/og-default.png"],
      },
    }
  }
  
export async function generateStaticParams() {
    const paths = getAllMessageIds();
    return paths;
}
