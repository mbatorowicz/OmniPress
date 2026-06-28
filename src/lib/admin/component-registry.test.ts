import { describe, expect, it } from 'vitest';
import {
	classifyRegistryGroup,
	COMPONENT_ADD_TEMPLATES,
	flattenUnitComponentSlots,
	getAddTemplatesForGroup,
	getAvailableSpecialComponents,
	groupSlotsByRegistry,
} from '@/lib/admin/component-registry';
import { migrateFlatSlotsToZones } from '@/lib/astro-layout/zones';
import type { DisplaySlot, SiteAstroLayout } from '@/lib/astro-layout/types';
import { emptySiteAstroLayout } from '@/lib/astro-layout/types';

function slot(id: string, component: string, widget?: DisplaySlot['widget']): DisplaySlot {
	return { id, label: id, component, widget };
}

describe('classifyRegistryGroup', () => {
	it('klasyfikuje specjalne, kategorie, linki i banery', () => {
		expect(classifyRegistryGroup(slot('a', 'sidebar.weather'))).toBe('special');
		expect(classifyRegistryGroup(slot('b', 'home.latest'))).toBe('categories');
		expect(
			classifyRegistryGroup(slot('c', 'sidebar.banner', { linkType: 'external', externalUrl: 'https://x' })),
		).toBe('links');
		expect(
			classifyRegistryGroup(slot('d', 'sidebar.banner', { linkType: 'page', pagePath: '/kontakt' })),
		).toBe('links');
		expect(classifyRegistryGroup(slot('e', 'sidebar.banner', { linkType: 'category' }))).toBe('banners');
		expect(classifyRegistryGroup(slot('f', 'footer.main'))).toBeNull();
	});
});

describe('flattenUnitComponentSlots', () => {
	it('pomija chrome i zwraca strefę instancji', () => {
		const layout: SiteAstroLayout = {
			...emptySiteAstroLayout(),
			zones: migrateFlatSlotsToZones([
				slot('home_latest', 'home.latest'),
				slot('sidebar_banner', 'sidebar.banner', { linkType: 'external' }),
				slot('footer_main', 'footer.main'),
			]),
			slots: [],
		};
		const entries = flattenUnitComponentSlots(layout);
		expect(entries.map((entry) => entry.slot.id)).toEqual(['home_latest', 'sidebar_banner']);
		expect(entries.find((entry) => entry.slot.id === 'sidebar_banner')?.zone).toBe('sidebar');
	});
});

describe('groupSlotsByRegistry', () => {
	it('grupuje wpisy po typie', () => {
		const grouped = groupSlotsByRegistry([
			{ slot: slot('a', 'sidebar.weather'), zone: 'sidebar' },
			{ slot: slot('b', 'home.latest'), zone: 'home' },
			{ slot: slot('c', 'sidebar.banner', { linkType: 'external' }), zone: 'footer' },
		]);
		expect(grouped.special).toHaveLength(1);
		expect(grouped.categories).toHaveLength(1);
		expect(grouped.links).toHaveLength(1);
		expect(grouped.banners).toHaveLength(0);
	});
});

describe('getAddTemplatesForGroup', () => {
	it('zwraca szablony przypisane do grupy', () => {
		expect(getAddTemplatesForGroup('links').map((template) => template.id)).toEqual([
			'external_link',
			'static_page',
		]);
		expect(getAddTemplatesForGroup('categories')[0]?.component).toBe('home.latest');
	});
});

describe('getAvailableSpecialComponents', () => {
	it('ukrywa już użyte singletony', () => {
		const available = getAvailableSpecialComponents([
			{ slot: slot('weather', 'sidebar.weather'), zone: 'sidebar' },
		]);
		expect(available.map((option) => option.component)).not.toContain('sidebar.weather');
		expect(available.map((option) => option.component)).toContain('sidebar.cert_advisories');
	});
});

describe('COMPONENT_ADD_TEMPLATES', () => {
	it('ma prefill linkType dla szablonów linków i banerów', () => {
		expect(COMPONENT_ADD_TEMPLATES.external_link.defaultWidget.linkType).toBe('external');
		expect(COMPONENT_ADD_TEMPLATES.static_page.defaultWidget.linkType).toBe('page');
		expect(COMPONENT_ADD_TEMPLATES.banner.defaultWidget.style).toBe('image');
	});
});
