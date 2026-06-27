import { describe, expect, it } from 'vitest';
import { buildNavTargetOptions, pickNavTargetValue } from './nav-target-options';

const options = buildNavTargetOptions(
	[{ path: '/zarzadzenia', title: 'Zarządzenia' }],
	[{ path: '/kontakt', title: 'Kontakt' }],
	{ emptyCategory: 'Brak', emptyPage: 'Brak' },
);

describe('pickNavTargetValue', () => {
	it('przy zmianie na kategorie nie zostawia kontaktu ze statycznej trasy', () => {
		const value = pickNavTargetValue('category', '/kontakt', options.category);
		expect(value).toBe('zarzadzenia');
	});

	it('zachowuje slug kategorii gdy pasuje', () => {
		const value = pickNavTargetValue('category', 'zarzadzenia', options.category);
		expect(value).toBe('zarzadzenia');
	});
});
