import { describe, expect, it } from 'vitest';
import {
	layoutSectionToSyncScope,
	withDraftSavedMeta,
} from './layout-sync-meta';
import {
	computeDraftLiveStatus,
	hashCategoriesLayout,
	hashNavigationLayout,
	withPublishedMeta,
} from './layout-sync-meta.server';
import type { SiteAstroLayout } from './types';

const sampleLayout: SiteAstroLayout = {
	navigation: [{ label: 'Start', href: '/' }],
	categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
	categoryDisplays: { home_feed: ['aktualnosci'] },
	slots: [{ id: 'home_feed', label: 'Feed', component: 'home.feed' }],
	navigationPath: 'src/config/omnipress-navigation.json',
	categoriesPath: 'src/config/omnipress-categories.json',
};

describe('layout-sync-meta', () => {
	it('hashNavigationLayout jest stabilny dla tego samego drzewa', () => {
		const a = hashNavigationLayout(sampleLayout.navigation);
		const b = hashNavigationLayout([{ label: 'Start', href: '/' }]);
		expect(a).toBe(b);
		expect(a).toHaveLength(16);
	});

	it('layoutSectionToSyncScope mapuje sekcje panelu', () => {
		expect(layoutSectionToSyncScope('navigation')).toBe('navigation');
		expect(layoutSectionToSyncScope('categories')).toBe('categories');
		expect(layoutSectionToSyncScope('components')).toBe('categories');
		expect(layoutSectionToSyncScope('all')).toBe('all');
	});

	it('withDraftSavedMeta ustawia lastDraftSavedAt', () => {
		const next = withDraftSavedMeta(sampleLayout);
		expect(next.sync?.lastDraftSavedAt).toBeTruthy();
	});

	it('withPublishedMeta zapisuje hash i skrót commita', () => {
		const next = withPublishedMeta(sampleLayout, {
			commitSha: 'abcdef1234567890',
			scope: 'all',
		});
		expect(next.sync?.lastPublishedSha).toBe('abcdef1');
		expect(next.sync?.publishedNavHash).toBe(hashNavigationLayout(sampleLayout.navigation));
		expect(next.sync?.publishedCategoriesHash).toBe(hashCategoriesLayout(sampleLayout));
	});

	it('computeDraftLiveStatus wykrywa rozjazd szkicu', () => {
		const liveNav = hashNavigationLayout(sampleLayout.navigation);
		const status = computeDraftLiveStatus(
			{ ...sampleLayout, navigation: [{ label: 'Inne', href: '/inne' }] },
			'navigation',
			{ navHash: liveNav },
		);
		expect(status).toBe('draft_ahead');
	});

	it('computeDraftLiveStatus zwraca in_sync gdy hash się zgadza', () => {
		const liveNav = hashNavigationLayout(sampleLayout.navigation);
		const status = computeDraftLiveStatus(sampleLayout, 'navigation', { navHash: liveNav });
		expect(status).toBe('in_sync');
	});
});
