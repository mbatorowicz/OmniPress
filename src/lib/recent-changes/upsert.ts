import type { RecentChangeEntry } from './types';
import { MAX_RECENT_CHANGES } from './types';

/** Aktualizuje wpis po sourceId lub href; sortuje malejąco po dacie; obcina listę. */
export function upsertRecentChange(
	entries: RecentChangeEntry[],
	incoming: RecentChangeEntry,
): RecentChangeEntry[] {
	const next = entries.filter((e) => {
		if (incoming.sourceId && e.sourceId === incoming.sourceId) return false;
		if (e.href === incoming.href) return false;
		return true;
	});
	next.unshift(incoming);
	next.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
	return next.slice(0, MAX_RECENT_CHANGES);
}
