import { getAllMessageIds } from "@/lib/messages"
import MessageDetail from "@/components/message-detail";

export default function Page({ params }: { params: { id: string } }) {

    return ( <MessageDetail id={params.id} /> )
}

export async function generateStaticParams() {
    const paths = getAllMessageIds();
    return paths;
}