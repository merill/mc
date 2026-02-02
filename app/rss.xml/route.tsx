
import { getAllMessages, getMessageSummary } from "@/lib/messages";
import RSS from "rss";

export async function GET() {
    const dataMessages = getAllMessages();
    const sortedMessages = [...dataMessages].sort((a, b) => new Date(b.LastModifiedDateTime ?? 0).getTime() - new Date(a.LastModifiedDateTime ?? 0).getTime());

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mc.merill.net";

    const feedOptions = {
        title: "Microsoft 365 Message Center Archive",
        description: "This site is an archive of Microsoft 365 Message Center messages for quick reference.",
        site_url: siteUrl,
        feed_url: `${siteUrl}/rss.xml`,
        pubDate: sortedMessages.length > 0 ? new Date(sortedMessages[0].LastModifiedDateTime ?? Date.now()) : new Date(),
    };

    const feed = new RSS(feedOptions);

    sortedMessages.forEach((item) => {
        feed.item({
            title: `${item.Id}: ${item.Title}`,
            description: getMessageSummary(item),
            url: `${siteUrl}/message/${item.Id}`,
            date: new Date(item.LastModifiedDateTime ?? Date.now()),
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
