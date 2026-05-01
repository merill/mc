import { Message, MessageSource } from '@/types/message';
import dataMessages from '@/@data/messages.json'
import dataRoadmap from '@/@data/roadmap.json'

const messages: Message[] = [...dataMessages, ...dataRoadmap].sort((a, b) => {
    const dateA = new Date(a.LastModifiedDateTime || a.StartDateTime || 0).getTime();
    const dateB = new Date(b.LastModifiedDateTime || b.StartDateTime || 0).getTime();

    return dateB - dateA;
});

export function getAllMessageIds(): { id: string }[] {
    return messages.map((item) => {
        return {
            id: item.Id,
        };
    });
}

export function getAllMessages(): Message[] {
    return messages;
}

export function getMessageData(id: string): Message | undefined{
    const message = messages.find((item) => item.Id === id);
    return message;
}

export function getMessageSummary(msg: Message | undefined): string {    
    const summary = msg?.Details?.find((item) => item.Name === "Summary");
    return summary?.Value?.toString() || "";
}

export function getMessageRoadmapID(msg: Message | undefined): string {    
    const roadmapId = msg?.Details?.find((item) => item.Name === "RoadmapIds");
    return roadmapId?.Value?.toString() || "";
}

export function getMessagePlatforms(msg: Message | undefined): string {    
    const platforms = msg?.Details?.find((item) => item.Name === "Platforms");
    return platforms?.Value?.toString() || "";
}

export function getMessageDetailValue(msg: Message | undefined, name: string): string {
    const detail = msg?.Details?.find((item) => item.Name === name);
    return detail?.Value?.toString() || "";
}

export function getMessageSource(msg: Message | undefined): MessageSource {
    return msg?.Source === MessageSource.Roadmap ? MessageSource.Roadmap : MessageSource.MessageCenter;
}

export function getMessageSourceLabel(msg: Message | undefined): string {
    return getMessageSource(msg) === MessageSource.Roadmap ? "Microsoft 365 Roadmap" : "Message Center";
}

export function getFormattedDate(dateInput: string | undefined | null): string {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();

    return `${month} ${day}, ${year}`;
  }
