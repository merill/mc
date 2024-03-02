import { getAllMessageIds, getMessageData } from "@/lib/messages"

export default function Page({ params }: { params: { id: string } }) {
    const msg = getMessageData(params.id);

    return <div>Message: {params.id} - {msg?.Title}</div>
}

export async function generateStaticParams() {
    const paths = getAllMessageIds();
    console.log(paths);
    return paths;
}