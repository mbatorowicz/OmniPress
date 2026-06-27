import { describe, expect, it } from 'vitest';
import { buildNavTargetOptions, formatNavTargetSummary, pickNavTargetValue } from './nav-target-options';

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

describe('formatNavTargetSummary', () => {
	it('zwraca etykietę typu bez linku', () => {
		expect(formatNavTargetSummary('none', '', options, hrefKindLabels)).toBe('Bez linku');
	});

	it('łączy typ i etykietę celu strony', () => {
		expect(formatNavTargetSummary('page', '/kontakt', options, hrefKindLabels)).toBe(
			'Strona · Kontakt',
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
