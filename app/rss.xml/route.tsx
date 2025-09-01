
import { getAllMessages, getMessageSummary } from "@/lib/messages";
import RSS from "rss";

export async function GET() {
    const dataMessages = getAllMessages();

    const feedOptions = {
        title: "Microsoft 365 Message Center Archive",
        description: "This site is an archive of Microsoft 365 Message Center messages for quick reference.",
        site_url: `https://mc.merill.net`,
        feed_url: `https://mc.merill.net/rss.xml`,
        pubDate: new Date(),
    };

    const feed = new RSS(feedOptions);

    dataMessages.map((item) => {
        const lastModifiedDateTime = new Date(item.LastModifiedDateTime ?? Date.now());
        feed.item({
            title: `${item.Id}: ${item.Title}`,
            description: getMessageSummary(item),
            url: `https://mc.merill.net/message/${item.Id}`,
            date: lastModifiedDateTime,
        });
    });

    return new Response(
        feed.xml({ indent: true }),
        {
            headers: {
                "Content-Type": "application/rss+xml;charset=utf-8",
            },
        },
    );
}
