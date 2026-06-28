import type { SiteAstroLayout } from './types';

export type LayoutSyncScope = 'navigation' | 'categories' | 'layout' | 'all';

export type DraftLiveScope = 'navigation' | 'categories';

export type DraftLiveStatus = 'in_sync' | 'draft_ahead' | 'live_ahead' | 'unknown';

export function layoutSectionToSyncScope(section: string): LayoutSyncScope {
	switch (section) {
		case 'navigation':
		case 'categories':
		case 'components':
		case 'layout':
			return 'layout';
		default:
			return 'all';
	}
}

export function withDraftSavedMeta(layout: SiteAstroLayout): SiteAstroLayout {
	return {
		...layout,
		sync: {
			...layout.sync,
			lastDraftSavedAt: new Date().toISOString(),
		},
	};
}
