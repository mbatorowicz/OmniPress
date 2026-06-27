import type { SiteAstroLayout } from './types';

export type LayoutSyncScope = 'navigation' | 'categories' | 'all';

export type DraftLiveScope = 'navigation' | 'categories';

export type DraftLiveStatus = 'in_sync' | 'draft_ahead' | 'unknown';

export function layoutSectionToSyncScope(section: string): LayoutSyncScope {
	switch (section) {
		case 'navigation':
			return 'navigation';
		case 'categories':
		case 'components':
			return 'categories';
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
