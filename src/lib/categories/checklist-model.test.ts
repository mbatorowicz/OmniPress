import { describe, expect, it } from 'vitest';
import { emptySiteAstroLayout } from '@/lib/astro-layout/types';
import {
	buildCategoryChecklistRows,
	buildCategoryChecklistSteps,
	categoryInHomeFeed,
	categoryInMenu,
} from './checklist-model';

function sampleLayout() {
	const layout = emptySiteAstroLayout();
	layout.categories = [
		{ slug: 'aktualnosci', name: 'Aktualności' },
		{ slug: 'odpady', name: 'Odpady' },
	];
	layout.slots = [{ id: 'home_latest', label: 'Aktualności', component: 'home.latest' }];
	layout.categoryDisplays = { home_latest: ['aktualnosci'] };
	layout.navigation = [{ label: 'Aktualności', href: '/aktualnosci' }];
	layout.sync = { lastDraftSavedAt: '2026-09-07T10:00:00.000Z' };
	return layout;
}

describe('category checklist', () => {
	it('rozpoznaje feed home.* i pozycję w menu', () => {
		const layout = sampleLayout();
		expect(categoryInHomeFeed(layout, 'aktualnosci')).toBe(true);
		expect(categoryInHomeFeed(layout, 'odpady')).toBe(false);
		expect(categoryInMenu(layout, 'aktualnosci')).toBe(true);
		expect(categoryInMenu(layout, 'odpady')).toBe(false);
	});

	it('składa wiersze i kroki z draftStatus', () => {
		const layout = sampleLayout();
		expect(buildCategoryChecklistRows(layout)).toEqual([
			{ slug: 'aktualnosci', name: 'Aktualności', inHomeFeed: true, inMenu: true },
			{ slug: 'odpady', name: 'Odpady', inHomeFeed: false, inMenu: false },
		]);
		expect(buildCategoryChecklistSteps(layout, 'draft_ahead')).toEqual([
			{ id: 'draft', done: true },
			{ id: 'published', done: false },
			{ id: 'homeFeed', done: false },
			{ id: 'menu', done: false },
		]);
		expect(buildCategoryChecklistSteps(layout, 'in_sync').find((step) => step.id === 'published')).toEqual(
			{ id: 'published', done: true },
		);
	});
});
