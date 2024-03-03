import { Message } from '@/types/message';
import dataMessages from '@/data/messages.json'

const messages: Message[] = dataMessages;

export function getAllMessageIds(): { id: string }[] {
    return dataMessages.map((item) => {
        return {
            id: item.Id,
        };
    });
}

export function getMessageData(id: string): Message | undefined{
    const message = messages.find((item) => item.Id === id);
    return message;
}

export function getMessageSummary(msg: Message | undefined): string {
    // return the first item in msg.Details where the Name is "Summary"
    const summary = msg?.Details?.find((item) => item.Name === "Summary");
    return summary?.Value?.toString() || "";
}