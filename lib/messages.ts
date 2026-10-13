import { Message, MessageArchive, MessageHistory, MessageSource } from '@/types/message';
import dataMessages from '@/@data/messages.json'
import dataArchive from '@/@data/messages-archive.json'
import dataRoadmap from '@/@data/roadmap.json'
import fs from 'fs'
import path from 'path'
import {
    getDisplayId,
    getFormattedDate,
    getMessageHeading,
    linkifyIds,
    stripHtml,
    summarizeChanges,
    truncateText,
} from '@/lib/message-format'

// Pure helpers live in `message-format.ts`, where client components can reach
// them; they are re-exported so build-time callers keep one import.
export { getDisplayId, getFormattedDate, getMessageHeading, stripHtml, summarizeChanges, truncateText }

// Azure updates changed in the last year, written by scripts/update-azure.mjs.
// Read from disk rather than imported so a checkout from before the first
// refresh that included them still builds.
function readAzureMessages(): Message[] {
    try {
        const raw = fs.readFileSync(path.join(process.cwd(), '@data', 'azure.json'), 'utf-8');
        const parsed = JSON.parse(raw);

        return Array.isArray(parsed) ? parsed as Message[] : [];
    } catch {
        return [];
    }
}

const messages: Message[] = [...dataMessages, ...dataRoadmap, ...readAzureMessages()].sort((a, b) => {
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
        // Every Azure update has a file of its own; Message Center posts that
        // have left the live feed are in the archive folder.
        const folder = id.startsWith('AZ') ? 'azure' : 'archive';
        const filePath = path.join(process.cwd(), '@data', folder, `${id}.json`);
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
    if (msg?.Source === MessageSource.Roadmap) return MessageSource.Roadmap;
    if (msg?.Source === MessageSource.Azure) return MessageSource.Azure;
    return MessageSource.MessageCenter;
}

const SOURCE_LABELS: Record<MessageSource, string> = {
    [MessageSource.MessageCenter]: "Message Center",
    [MessageSource.Roadmap]: "Microsoft 365 Roadmap",
    [MessageSource.Azure]: "Azure Updates",
};

export function getMessageSourceLabel(msg: Message | undefined): string {
    return SOURCE_LABELS[getMessageSource(msg)];
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

// ---------------------------------------------------------------------------
// Cross-message references (MC↔MC linking)
// ---------------------------------------------------------------------------

const MC_ID_RE = /\bMC\d{6,7}\b/g;

// Set of every message id we know about. Built lazily and used to validate
// cross-references so we never emit a link to a non-existent page.
let _knownIds: Set<string> | null = null;
function getKnownIds(): Set<string> {
    if (_knownIds) return _knownIds;
    const set = new Set<string>();
    for (const m of messages) set.add(m.Id);
    for (const a of archiveIndex) set.add(a.Id);
    _knownIds = set;
    return set;
}

// Inverse-reference index: for each message id, which other message ids
// mention it in their Body.Content or Summary. Built lazily on first use
// so the cost is amortized across the build.
interface RelationIndex {
    references: Map<string, string[]>;   // id -> list of MC ids that THIS id references
    referencedBy: Map<string, string[]>; // id -> list of MC ids that reference THIS id
}

let _relations: RelationIndex | null = null;

function buildRelations(): RelationIndex {
    const references = new Map<string, Set<string>>();
    const referencedBy = new Map<string, Set<string>>();
    const known = getKnownIds();

    const addEdge = (from: string, to: string) => {
        if (from === to) return;
        if (!known.has(to)) return;
        if (!references.has(from)) references.set(from, new Set());
        references.get(from)!.add(to);
        if (!referencedBy.has(to)) referencedBy.set(to, new Set());
        referencedBy.get(to)!.add(from);
    };

    const scan = (id: string, text: string | undefined | null) => {
        if (!text) return;
        const matches = text.match(MC_ID_RE);
        if (!matches) return;
        for (const m of matches) addEdge(id, m);
    };

    // Active feed (messages.json + roadmap.json).
    for (const m of messages) {
        scan(m.Id, m.Body?.Content);
        scan(m.Id, getMessageSummary(m));
    }

    // Archive-only ids: full body lives on disk; the slim index doesn't carry
    // the body, so we read each archive file. This adds O(N) reads at first
    // call but is amortized across the build.
    const knownActiveIds = new Set(messages.map((m) => m.Id));
    const archiveDir = path.join(process.cwd(), '@data', 'archive');
    let archiveFiles: string[] = [];
    try {
        archiveFiles = fs.readdirSync(archiveDir).filter((f) => f.endsWith('.json'));
    } catch {
        archiveFiles = [];
    }
    for (const file of archiveFiles) {
        const id = file.slice(0, -5);
        if (knownActiveIds.has(id)) continue;
        try {
            const raw = fs.readFileSync(path.join(archiveDir, file), 'utf-8');
            const msg = JSON.parse(raw) as Message;
            scan(msg.Id, msg.Body?.Content);
            scan(msg.Id, getMessageSummary(msg));
        } catch {
            // ignore
        }
    }

    const sortIdsDesc = (a: string, b: string) => {
        // MC ids are numeric after the prefix; sort highest (newest) first.
        const na = Number(a.replace(/^MC/, ''));
        const nb = Number(b.replace(/^MC/, ''));
        return nb - na;
    };

    const finalize = (m: Map<string, Set<string>>) => {
        const out = new Map<string, string[]>();
        for (const [k, v] of m) out.set(k, [...v].sort(sortIdsDesc));
        return out;
    };

    return {
        references: finalize(references),
        referencedBy: finalize(referencedBy),
    };
}

function getRelations(): RelationIndex {
    if (!_relations) _relations = buildRelations();
    return _relations;
}

export function getMessageReferences(id: string): string[] {
    return getRelations().references.get(id) ?? [];
}

export function getMessageReferencedBy(id: string): string[] {
    return getRelations().referencedBy.get(id) ?? [];
}

// Links every plain-text MC id that has a page here; see `linkifyIds`.
export function linkifyMcIds(html: string | undefined | null, currentId?: string): string {
    const known = getKnownIds();
    return linkifyIds(html, (id) => known.has(id), currentId);
}
