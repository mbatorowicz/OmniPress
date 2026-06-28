import { describe, expect, it } from 'vitest';
import {
	findSlotByComponent,
	getCategoryFeedSlots,
	readSlotEditorZone,
	resolveHomeFeedSectionTitle,
	sortSlotsForEditor,
	sortSlotsByOrder,
	swapAdjacentOrders,
} from './slots';
import { isCategoryFeedComponent } from './components';
import type { DisplaySlot, SiteAstroLayout } from './types';

describe('swapAdjacentOrders', () => {
	it('zamienia wartości order między sąsiednimi slotami', () => {
		expect(swapAdjacentOrders(10, 20)).toEqual([20, 10]);
		expect(swapAdjacentOrders(30, 30)).toEqual([30, 30]);
	});
});

describe('sortSlotsByOrder', () => {
	it('sortuje rosnąco po widget.order', () => {
		const slots: DisplaySlot[] = [
			{ id: 'b', label: 'B', component: 'sidebar.banner', widget: { order: 20 } },
			{ id: 'a', label: 'A', component: 'sidebar.cert_advisories', widget: { order: 10 } },
		];
		expect(sortSlotsByOrder(slots).map((s) => s.id)).toEqual(['a', 'b']);
	});
});

describe('findSlotByComponent', () => {
	it('znajduje singleton CERT', () => {
		const layout: SiteAstroLayout = {
			navigation: [],
			categories: [],
			categoryDisplays: {},
			slots: [{ id: 'cert', label: 'CERT', component: 'sidebar.cert_advisories', widget: { limit: 5 } }],
			navigationPath: 'n.json',
			categoriesPath: 'c.json',
		};
		expect(findSlotByComponent(layout, 'sidebar.cert_advisories')?.id).toBe('cert');
	});
});

describe('isCategoryFeedComponent', () => {
	it('dotyczy tylko home.*', () => {
		expect(isCategoryFeedComponent('home.pinned')).toBe(true);
		expect(isCategoryFeedComponent('sidebar.banner')).toBe(false);
	});
});

describe('getCategoryFeedSlots', () => {
	it('filtruje sloty feedu kategorii', () => {
		const slots: DisplaySlot[] = [
			{ id: 'h', label: 'Home', component: 'home.latest' },
			{ id: 'b', label: 'Baner', component: 'sidebar.banner' },
		];
		expect(getCategoryFeedSlots(slots).map((s) => s.id)).toEqual(['h']);
	});
});

describe('resolveHomeFeedSectionTitle', () => {
	it('preferuje sectionTitle, potem title, potem label', () => {
		expect(
			resolveHomeFeedSectionTitle({
				id: 'x',
				label: 'Label',
				component: 'home.latest',
				widget: { sectionTitle: 'Sekcja', title: 'Tytuł' },
			}),
		).toBe('Sekcja');
		expect(
			resolveHomeFeedSectionTitle({
				id: 'x',
				label: 'Label',
				component: 'home.latest',
				widget: { title: 'Tytuł' },
			}),
		).toBe('Tytuł');
		expect(
			resolveHomeFeedSectionTitle({ id: 'x', label: 'Label', component: 'home.latest' }),
		).toBe('Label');
	});
});

describe('sortSlotsForEditor', () => {
	it('sortuje home przed sidebar i po order', () => {
		const slots: DisplaySlot[] = [
			{ id: 's', label: 'S', component: 'sidebar.banner', widget: { order: 5 } },
			{ id: 'h2', label: 'H2', component: 'home.latest', widget: { order: 20 } },
			{ id: 'h1', label: 'H1', component: 'home.pinned', widget: { order: 10 } },
		];
		expect(sortSlotsForEditor(slots).map((s) => s.id)).toEqual(['h1', 'h2', 's']);
		expect(readSlotEditorZone('home.latest')).toBe('home');
		expect(readSlotEditorZone('sidebar.weather')).toBe('sidebar');
	});
});
