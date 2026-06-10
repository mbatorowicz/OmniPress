import { describe, expect, it } from 'vitest';
import {
	findSlotByComponent,
	getCategoryFeedSlots,
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
