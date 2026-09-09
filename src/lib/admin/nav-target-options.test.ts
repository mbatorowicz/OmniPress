import { describe, expect, it } from 'vitest';
import { buildNavTargetOptions, formatNavOptionLabel, formatNavTargetSummary, pickNavTargetValue } from './nav-target-options';

const options = buildNavTargetOptions(
	[{ path: '/zarzadzenia', title: 'Zarządzenia' }],
	[{ path: '/kontakt', title: 'Kontakt' }],
	{ emptyCategory: 'Brak', emptyPage: 'Brak' },
);

const hrefKindLabels = {
	none: 'Bez linku',
	category: 'Kategoria',
	page: 'Strona',
	static: 'Stała trasa',
	custom: 'URL',
	external: 'Zewnętrzny',
};

describe('formatNavOptionLabel', () => {
	it('dopisuje ścieżkę do nazwy', () => {
		expect(formatNavOptionLabel('Strona główna', '/')).toBe('Strona główna (/)');
		expect(formatNavOptionLabel('Kontakt', '/kontakt')).toBe('Kontakt (/kontakt)');
	});

	it('nie dubluje gdy nazwa to już ścieżka', () => {
		expect(formatNavOptionLabel('/kontakt', '/kontakt')).toBe('/kontakt');
	});
});

describe('formatNavTargetSummary', () => {
	it('zwraca etykietę typu bez linku', () => {
		expect(formatNavTargetSummary('none', '', options, hrefKindLabels)).toBe('Bez linku');
	});

	it('łączy typ i etykietę celu strony', () => {
		expect(formatNavTargetSummary('page', '/kontakt', options, hrefKindLabels)).toBe(
			'Strona · Kontakt (/kontakt)',
		);
	});

	it('pokazuje ścieżkę przy stałej trasie', () => {
		expect(formatNavTargetSummary('static', '/', options, hrefKindLabels)).toBe(
			'Stała trasa · Strona główna (/)',
		);
	});
});

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
