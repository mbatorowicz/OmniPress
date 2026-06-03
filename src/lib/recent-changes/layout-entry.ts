import type { RecentChangeEntry } from './types';

export const LAYOUT_CHANGE_SOURCE_ID = 'omnipress-layout';

export function buildLayoutRecentChangeEntry(): RecentChangeEntry {
	return {
		title: 'Zaktualizowano menu i układ strony',
		href: '/',
		kind: 'layout',
		changedAt: new Date().toISOString(),
		sourceId: LAYOUT_CHANGE_SOURCE_ID,
	};
}
