import type { RecentChangeEntry, RecentChangesFile } from './types';
import { emptyRecentChangesFile } from './types';

function isEntry(raw: unknown): raw is RecentChangeEntry {
	if (!raw || typeof raw !== 'object') return false;
	const o = raw as RecentChangeEntry;
	return (
		typeof o.title === 'string' &&
		typeof o.href === 'string' &&
		typeof o.kind === 'string' &&
		typeof o.changedAt === 'string'
	);
}

export function parseRecentChangesFile(text: string): RecentChangesFile {
	const parsed = JSON.parse(text) as unknown;
	if (!parsed || typeof parsed !== 'object') return emptyRecentChangesFile();
	const entries = (parsed as RecentChangesFile).entries;
	if (!Array.isArray(entries)) return emptyRecentChangesFile();
	return {
		entries: entries.filter(isEntry).map((e) => ({
			title: e.title.trim(),
			href: e.href.trim(),
			kind: e.kind,
			changedAt: e.changedAt,
			sourceId: e.sourceId?.trim() || undefined,
		})),
	};
}

export function buildRecentChangesPayload(file: RecentChangesFile): string {
	return `${JSON.stringify(file, null, '\t')}\n`;
}
