import { Message, MessageArchive } from '@/types/message';
import dataMessages from '@/@data/messages.json'
import dataArchive from '@/@data/messages-archive.json'
import fs from 'fs'
import path from 'path'

const messages: Message[] = dataMessages;
const archiveIndex: MessageArchive[] = dataArchive as MessageArchive[];

export function getAllMessageIds(): { id: string }[] {
    const activeIds = new Set(dataMessages.map((item) => item.Id));
    const archiveIds = archiveIndex
        .filter((item) => !activeIds.has(item.Id))
        .map((item) => ({ id: item.Id }));
    return [
        ...dataMessages.map((item) => ({ id: item.Id })),
        ...archiveIds,
    ];
}

export function getAllMessages(): Message[] {
    return dataMessages;
}

export function getMessageData(id: string): Message | undefined {
    const active = messages.find((item) => item.Id === id);
    if (active) return active;

    // Fall back to the individual archive file for archived-only messages
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

export function getMessageRoadmapID(msg: Message | undefined): string {    
    const roadmapId = msg?.Details?.find((item) => item.Name === "RoadmapIds");
    return roadmapId?.Value?.toString() || "";
}

export function getMessagePlatforms(msg: Message | undefined): string {    
    const platforms = msg?.Details?.find((item) => item.Name === "Platforms");
    return platforms?.Value?.toString() || "";
}


export function getFormattedDate(dateInput: string | undefined | null): string {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();

    return `${month} ${day}, ${year}`;
  }
