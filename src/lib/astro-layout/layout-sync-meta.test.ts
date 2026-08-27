import { describe, expect, it } from 'vitest';
import {
	layoutSectionToSyncScope,
	withDraftSavedMeta,
} from './layout-sync-meta';
import {
	computeCombinedDraftLiveStatus,
	computeDraftLiveStatus,
	hashLayoutFile,
	hashNavigationLayout,
	resolveDraftLiveStatus,
	withPublishedMeta,
} from './layout-sync-meta.server';
import { migrateFlatSlotsToZones } from './zones';
import type { DisplaySlot, SiteAstroLayout } from './types';

const sampleSlots: DisplaySlot[] = [{ id: 'home_feed', label: 'Feed', component: 'home.latest' }];

const sampleLayout: SiteAstroLayout = {
	navigation: [{ label: 'Start', href: '/' }],
	categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
	categoryDisplays: { home_feed: ['aktualnosci'] },
	zones: migrateFlatSlotsToZones(sampleSlots),
	slots: sampleSlots,
	navigationPath: 'src/config/omnipress-navigation.json',
	categoriesPath: 'src/config/omnipress-categories.json',
	layoutPath: 'src/config/omnipress-layout.json',
};

describe('layout-sync-meta', () => {
	it('hashNavigationLayout jest stabilny dla tego samego drzewa', () => {
		const a = hashNavigationLayout(sampleLayout.navigation);
		const b = hashNavigationLayout([{ label: 'Start', href: '/' }]);
		expect(a).toBe(b);
		expect(a).toHaveLength(16);
	});

	it('layoutSectionToSyncScope mapuje sekcje panelu', () => {
		expect(layoutSectionToSyncScope('navigation')).toBe('layout');
		expect(layoutSectionToSyncScope('categories')).toBe('layout');
		expect(layoutSectionToSyncScope('components')).toBe('layout');
		expect(layoutSectionToSyncScope('layout')).toBe('layout');
		expect(layoutSectionToSyncScope('all')).toBe('all');
	});

	it('withDraftSavedMeta ustawia lastDraftSavedAt', () => {
		const next = withDraftSavedMeta(sampleLayout);
		expect(next.sync?.lastDraftSavedAt).toBeTruthy();
	});

	it('withPublishedMeta zapisuje hash, blob sha i skrót commita', () => {
		const next = withPublishedMeta(sampleLayout, {
			commitSha: 'abcdef1234567890',
			scope: 'all',
			liveBlobSha: 'blob123',
			layoutContract: 'unified',
		});
		expect(next.sync?.lastPublishedSha).toBe('abcdef1');
		expect(next.sync?.publishedLayoutHash).toBe(hashLayoutFile(sampleLayout));
		expect(next.sync?.publishedLiveBlobSha).toBe('blob123');
		expect(next.sync?.layoutContract).toBe('unified');
	});

	it('computeDraftLiveStatus wykrywa rozjazd szkicu', () => {
		const liveHash = hashLayoutFile(sampleLayout);
		const status = computeDraftLiveStatus(
			{ ...sampleLayout, navigation: [{ label: 'Inne', href: '/inne' }] },
			'navigation',
			{ layoutHash: liveHash },
		);
		expect(status).toBe('draft_ahead');
	});

	it('computeDraftLiveStatus zwraca in_sync gdy hash się zgadza', () => {
		const liveHash = hashLayoutFile(sampleLayout);
		const status = computeDraftLiveStatus(sampleLayout, 'navigation', { layoutHash: liveHash });
		expect(status).toBe('in_sync');
	});

	it('computeCombinedDraftLiveStatus wymaga zgodnosci layoutu', () => {
		const liveHash = hashLayoutFile(sampleLayout);
		const status = computeCombinedDraftLiveStatus(sampleLayout, {
			layoutHash: liveHash,
			layoutContract: 'unified',
		});
		expect(status.combined).toBe('in_sync');
		expect(status.nav).toBe('in_sync');
		expect(status.categories).toBe('in_sync');
	});

	it('resolveDraftLiveStatus — fast path bez GitHub gdy szkic = ostatnia publikacja', () => {
		const hash = hashLayoutFile(sampleLayout);
		const layout = {
			...sampleLayout,
			sync: { publishedLayoutHash: hash },
		};
		expect(resolveDraftLiveStatus(layout, null)).toBe('in_sync');
	});

	it('resolveDraftLiveStatus — live_ahead gdy blob na GitHub się zmienił', () => {
		const hash = hashLayoutFile(sampleLayout);
		const layout = {
			...sampleLayout,
			sync: { publishedLayoutHash: hash, publishedLiveBlobSha: 'old-blob' },
		};
		const status = resolveDraftLiveStatus(layout, {
			blobSha: 'new-blob',
			layoutHash: 'different-hash',
			layoutContract: 'unified',
		});
		expect(status).toBe('live_ahead');
	});
});
