
import { DataTable } from "@/app/messages-table/data-table"
import { MessageView, columns } from "@/app/messages-table/columns";
import { getAllMessages, getFormattedDate, getMessageSource, getMessageSourceLabel } from "@/lib/messages";

function getData(): MessageView[] {

    const dataMessages = getAllMessages();

    return dataMessages.map((item): MessageView => ({
        id: item.Id,
        title: item.Title,
        service: item.Services,
        lastUpdated: getFormattedDate(item.LastModifiedDateTime),
        isMajor: item.IsMajorChange ?? false,
        source: getMessageSource(item),
        sourceLabel: getMessageSourceLabel(item)
    }));
}

export default function MessagesTable2() {
    const data = getData();

    return (
        <div className="">
            <DataTable columns={columns} data={data} />
        </div>
    )
}
