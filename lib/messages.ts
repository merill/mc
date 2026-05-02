import { Message, MessageArchive, MessageSource } from '@/types/message';
import dataMessages from '@/@data/messages.json'
import dataArchive from '@/@data/messages-archive.json'
import dataRoadmap from '@/@data/roadmap.json'
import fs from 'fs'
import path from 'path'

const messages: Message[] = [...dataMessages, ...dataRoadmap].sort((a, b) => {
    const dateA = new Date(a.LastModifiedDateTime || a.StartDateTime || 0).getTime();
    const dateB = new Date(b.LastModifiedDateTime || b.StartDateTime || 0).getTime();

    return dateB - dateA;
});
const archiveIndex: MessageArchive[] = dataArchive as MessageArchive[];

export function getAllMessageIds(): { id: string }[] {
    const messageIds = messages.map((item) => {
        return {
            id: item.Id,
        };
    });
    const activeIds = new Set(messageIds.map((item) => item.id));
    const archiveIds = archiveIndex
        .filter((item) => !activeIds.has(item.Id))
        .map((item) => ({ id: item.Id }));

    return [...messageIds, ...archiveIds];
}

export function getAllMessages(): Message[] {
    return messages;
}

export function getMessageData(id: string): Message | undefined{
    const message = messages.find((item) => item.Id === id);

    if (message) return message;

    try {
        const filePath = path.join(process.cwd(), '@data', 'archive', `${id}.json`);
        const raw = fs.readFileSync(filePath, 'utf-8');

        return JSON.parse(raw) as Message;
    } catch {
        return undefined;
    }
}

export function getMessageSummary(msg: Message | undefined): string {    
    const summary = msg?.Details?.find((item) => item.Name === "Summary");
    return summary?.Value?.toString() || "";
}

export function stripHtml(value: string | undefined | null): string {
    if (!value) return "";

    return value
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

export function truncateText(value: string, maxLength = 180): string {
    if (value.length <= maxLength) return value;

    const truncated = value.slice(0, maxLength - 1).trimEnd();
    const lastSpace = truncated.lastIndexOf(" ");

    return `${lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated}…`;
}

export function getMessageDescription(msg: Message | undefined): string {
    return truncateText(stripHtml(getMessageSummary(msg) || msg?.Body?.Markdown || msg?.Body?.Content));
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
