import { Message, MessageArchive, MessageHistory, MessageSource, MessageVersion } from '@/types/message';
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

// ---------------------------------------------------------------------------
// Version history
// ---------------------------------------------------------------------------

const historyCache = new Map<string, MessageHistory | null>();

export function getMessageHistory(id: string): MessageHistory | undefined {
    if (historyCache.has(id)) {
        const cached = historyCache.get(id);
        return cached ?? undefined;
    }
    try {
        const filePath = path.join(process.cwd(), '@data', 'history', `${id}.json`);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as MessageHistory;
        historyCache.set(id, parsed);
        return parsed;
    } catch {
        historyCache.set(id, null);
        return undefined;
    }
}

export function hasMultipleVersions(id: string): boolean {
    const history = getMessageHistory(id);
    return !!history && history.versions.length > 1;
}

// URL-safe slug for an ISO timestamp. We replace `:` and `.` with `-` so the
// slug is filesystem- and URL-safe while remaining humanly readable.
export function slugifyCapturedAt(capturedAt: string): string {
    return capturedAt.replace(/[:.]/g, '-');
}

export function unslugifyCapturedAt(slug: string): string {
    // ISO format: YYYY-MM-DDTHH-MM-SS-sssZ → reinsert separators.
    const m = slug.match(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})(?:-(\d+))?(Z)?$/);
    if (m) {
        const [, ymdHH, mm, ss, ms, z] = m;
        const base = `${ymdHH}:${mm}:${ss}`;
        return ms ? `${base}.${ms}${z ?? ''}` : `${base}${z ?? ''}`;
    }
    return slug;
}

export function getMessageVersion(id: string, capturedAtSlug: string): MessageVersion | undefined {
    const history = getMessageHistory(id);
    if (!history) return undefined;
    return history.versions.find((v) => slugifyCapturedAt(v.capturedAt) === capturedAtSlug);
}

export function getAllVersionParams(): { id: string; capturedAt: string }[] {
    const ids = listAllHistoryIds();
    const out: { id: string; capturedAt: string }[] = [];
    for (const id of ids) {
        const history = getMessageHistory(id);
        if (!history || history.versions.length < 2) continue;
        // Latest version is rendered by the main /message/[id] page; only
        // older versions need their own snapshot page.
        const versions = history.versions.slice(0, -1);
        for (const v of versions) {
            out.push({ id, capturedAt: slugifyCapturedAt(v.capturedAt) });
        }
    }
    return out;
}

const MAX_PAIRS_PER_MESSAGE = 20;

export function getAllComparePairs(): { id: string; from: string; to: string }[] {
    const ids = listAllHistoryIds();
    const out: { id: string; from: string; to: string }[] = [];
    for (const id of ids) {
        const history = getMessageHistory(id);
        if (!history || history.versions.length < 2) continue;
        // Cap to avoid combinatorial explosion on very volatile messages.
        const versions = history.versions.length > MAX_PAIRS_PER_MESSAGE
            ? history.versions.slice(history.versions.length - MAX_PAIRS_PER_MESSAGE)
            : history.versions;
        for (let i = 0; i < versions.length; i++) {
            for (let j = 0; j < versions.length; j++) {
                if (i === j) continue;
                out.push({
                    id,
                    from: slugifyCapturedAt(versions[i].capturedAt),
                    to: slugifyCapturedAt(versions[j].capturedAt),
                });
            }
        }
    }
    return out;
}

function listAllHistoryIds(): string[] {
    try {
        const dir = path.join(process.cwd(), '@data', 'history');
        return fs.readdirSync(dir)
            .filter((f) => f.endsWith('.json'))
            .map((f) => f.slice(0, -5));
    } catch {
        return [];
    }
}

// Returns a short label of which top-level fields differ between two
// messages — used for the timeline summary line. Body changes are detected
// by content equality, not diff size.
export function summarizeChanges(prev: Message | undefined, next: Message): string[] {
    if (!prev) return ["Initial version"];
    const changed: string[] = [];
    if ((prev.Title ?? "") !== (next.Title ?? "")) changed.push("Title");
    if ((prev.Body?.Content ?? "") !== (next.Body?.Content ?? "")) changed.push("Body");
    if (JSON.stringify([...(prev.Tags ?? [])].sort()) !== JSON.stringify([...(next.Tags ?? [])].sort())) changed.push("Tags");
    if (JSON.stringify([...(prev.Services ?? [])].sort()) !== JSON.stringify([...(next.Services ?? [])].sort())) changed.push("Services");
    if ((prev.Category ?? "") !== (next.Category ?? "")) changed.push("Category");
    if ((prev.Severity ?? "") !== (next.Severity ?? "")) changed.push("Severity");
    if (!!prev.IsMajorChange !== !!next.IsMajorChange) changed.push("Major change flag");
    if ((prev.ActionRequiredByDateTime ?? null) !== (next.ActionRequiredByDateTime ?? null)) changed.push("Act-by date");
    if ((prev.EndDateTime ?? null) !== (next.EndDateTime ?? null)) changed.push("End date");

    const prevStatus = prev.Details?.find((d) => d.Name === "Status")?.Value ?? "";
    const nextStatus = next.Details?.find((d) => d.Name === "Status")?.Value ?? "";
    if (prevStatus !== nextStatus) changed.push("Status");
    const prevPhase = prev.Details?.find((d) => d.Name === "ReleasePhase")?.Value ?? "";
    const nextPhase = next.Details?.find((d) => d.Name === "ReleasePhase")?.Value ?? "";
    if (prevPhase !== nextPhase) changed.push("Release phase");

    return changed.length ? changed : ["No tracked field changed"];
}
