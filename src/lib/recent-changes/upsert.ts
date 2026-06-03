import type { RecentChangeEntry } from './types';
import { MAX_RECENT_CHANGES } from './types';

/** Aktualizuje wpis po sourceId; wpisy bez sourceId (ogłoszenia ręczne) zawsze dopisuje. */
export function upsertRecentChange(
	entries: RecentChangeEntry[],
	incoming: RecentChangeEntry,
): RecentChangeEntry[] {
	let next = entries;
	if (incoming.sourceId) {
		next = entries.filter((e) => e.sourceId !== incoming.sourceId);
		if (incoming.kind === 'news') {
			next = next.filter((e) => e.href !== incoming.href);
		}
	}
	next.unshift(incoming);
	next.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
	return next.slice(0, MAX_RECENT_CHANGES);
}
