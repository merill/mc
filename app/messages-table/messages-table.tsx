
import { DataTable } from "@/app/messages-table/data-table"
import { MessageView, columns } from "@/app/messages-table/columns";
import { getAllMessages, getFormattedDate, getMessageSource, getMessageSourceLabel } from "@/lib/messages";
import tableServices from "@/@data/table-services.json";

// ISO day used for sorting; the display string cannot be sorted meaningfully.
function toIsoDay(value: string | undefined | null): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function getData(): MessageView[] {

    const dataMessages = getAllMessages();

    return dataMessages.map((item): MessageView => ({
        id: item.Id,
        title: item.Title,
        service: item.Services,
        lastUpdated: getFormattedDate(item.LastModifiedDateTime),
        date: toIsoDay(item.LastModifiedDateTime),
        isMajor: item.IsMajorChange ?? false,
        isArchived: false,
        source: getMessageSource(item),
        sourceLabel: getMessageSourceLabel(item)
    }));
}

export default function MessagesTable2() {
    const data = getData();

    return (
        <div className="">
            <DataTable columns={columns} data={data} archiveUrl="/messages-archive.json" services={tableServices} />
        </div>
    )
}
