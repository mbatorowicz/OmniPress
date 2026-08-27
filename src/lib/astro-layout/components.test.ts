import { describe, expect, it } from 'vitest';
import {
	getAllowedZones,
	getComponentKind,
	getComponentZone,
	getComponentsAddableInZone,
	getComponentsOfKind,
	getComponentsOfZone,
	getDefaultComponentZone,
	isCategoryFeedComponent,
	isComponentAllowedInZone,
	LAYOUT_EDITOR_ZONE_ORDER,
	slotHasSettingsPanel,
	supportsHideWhenEmpty,
} from './components';

describe('layout component kinds', () => {
	it('mapuje komponenty na kind', () => {
		expect(getComponentKind('home.pinned')).toBe('home_feed');
		expect(getComponentKind('sidebar.weather')).toBe('live_feed');
		expect(getComponentKind('sidebar.cert_advisories')).toBe('live_feed');
		expect(getComponentKind('sidebar.recent_changes')).toBe('local_feed');
		expect(getComponentKind('topbar.tagline')).toBe('chrome');
		expect(getComponentKind('header.navigation')).toBe('navigation');
		expect(getComponentKind('sidebar.banner')).toBe('banner');
		expect(getComponentKind('unknown')).toBeNull();
	});

	it('mapuje komponenty na strefę domyślną', () => {
		expect(getDefaultComponentZone('home.latest')).toBe('home');
		expect(getDefaultComponentZone('sidebar.weather')).toBe('sidebar');
		expect(getDefaultComponentZone('footer.main')).toBe('footer');
		expect(getComponentZone('site.meta')).toBe('site');
	});

	it('pozwala umieścić IMGW w stopce', () => {
		expect(isComponentAllowedInZone('sidebar.weather', 'footer')).toBe(true);
		expect(isComponentAllowedInZone('sidebar.weather', 'home')).toBe(false);
		expect(getAllowedZones('sidebar.banner')).toEqual(['sidebar', 'footer']);
	});

	it('zwraca komponenty dodawalne w strefie', () => {
		expect(getComponentsAddableInZone('footer')).toContain('sidebar.weather');
		expect(getComponentsAddableInZone('footer')).toContain('footer.main');
		expect(getComponentsAddableInZone('home')).not.toContain('sidebar.banner');
	});

	it('zwraca komponenty danego kind', () => {
		expect(getComponentsOfKind('home_feed')).toEqual(['home.pinned', 'home.latest']);
		expect(getComponentsOfKind('live_feed')).toEqual(['sidebar.weather', 'sidebar.cert_advisories']);
		expect(getComponentsOfKind('local_feed')).toEqual(['sidebar.recent_changes']);
	});

	it('zwraca komponenty z domyślną strefą', () => {
		expect(getComponentsOfZone('topbar')).toEqual(['topbar.tagline']);
		expect(getComponentsOfZone('header')).toEqual(['header.brand', 'header.navigation']);
	});

	it('wyprowadza categoryFeed z home_feed', () => {
		expect(isCategoryFeedComponent('home.latest')).toBe(true);
		expect(isCategoryFeedComponent('sidebar.recent_changes')).toBe(false);
	});

	it('wyklucza chrome i baner z hideWhenEmpty', () => {
		expect(supportsHideWhenEmpty('sidebar.weather')).toBe(true);
		expect(supportsHideWhenEmpty('topbar.tagline')).toBe(false);
		expect(supportsHideWhenEmpty('sidebar.banner')).toBe(false);
	});

	it('LAYOUT_EDITOR_ZONE_ORDER odpowiada kolejności renderu strony', () => {
		expect(LAYOUT_EDITOR_ZONE_ORDER[0]).toBe('topbar');
		expect(LAYOUT_EDITOR_ZONE_ORDER).toContain('header');
		expect(LAYOUT_EDITOR_ZONE_ORDER.at(-1)).toBe('site');
	});

	it('slotHasSettingsPanel ukrywa panel dla nawigacji', () => {
		expect(slotHasSettingsPanel('header.navigation')).toBe(false);
		expect(slotHasSettingsPanel('topbar.tagline')).toBe(true);
		expect(slotHasSettingsPanel('header.brand')).toBe(true);
		expect(slotHasSettingsPanel('sidebar.weather')).toBe(true);
	});
});
