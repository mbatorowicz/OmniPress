import { describe, expect, it } from 'vitest';
import {
	getComponentKind,
	getComponentsOfKind,
	isCategoryFeedComponent,
	supportsHideWhenEmpty,
} from './components';

describe('layout component kinds', () => {
	it('mapuje komponenty na kind', () => {
		expect(getComponentKind('home.pinned')).toBe('home_feed');
		expect(getComponentKind('sidebar.weather')).toBe('live_feed');
		expect(getComponentKind('sidebar.cert_advisories')).toBe('live_feed');
		expect(getComponentKind('sidebar.banner')).toBe('banner');
		expect(getComponentKind('unknown')).toBeNull();
	});

	it('zwraca komponenty danego kind', () => {
		expect(getComponentsOfKind('home_feed')).toEqual(['home.pinned', 'home.latest']);
		expect(getComponentsOfKind('live_feed')).toEqual(['sidebar.weather', 'sidebar.cert_advisories']);
	});

	it('wyprowadza categoryFeed z home_feed', () => {
		expect(isCategoryFeedComponent('home.latest')).toBe(true);
		expect(isCategoryFeedComponent('sidebar.recent_changes')).toBe(false);
	});

	it('wyklucza baner z hideWhenEmpty', () => {
		expect(supportsHideWhenEmpty('sidebar.weather')).toBe(true);
		expect(supportsHideWhenEmpty('sidebar.banner')).toBe(false);
	});
});
