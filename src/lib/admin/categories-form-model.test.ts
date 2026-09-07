import { describe, expect, it } from 'vitest';
import {
	categoryRowPostCount,
	formatCategoryUrlPreview,
	isLastCategoryRow,
	parseCategoryPostCounts,
} from './categories-form-model';

describe('formatCategoryUrlPreview', () => {
	it('pokazuje znormalizowany adres archiwum', () => {
		expect(formatCategoryUrlPreview('Zarządzenia')).toBe('/zarzadzenia/');
		expect(formatCategoryUrlPreview('mazowsze-bez-smogu')).toBe('/mazowsze-bez-smogu/');
	});

	it('przy pustym slugu zostawia kreskę, nie /{slug}/', () => {
		expect(formatCategoryUrlPreview('')).toBe('—');
		expect(formatCategoryUrlPreview('!!!')).toBe('—');
	});
});

describe('parseCategoryPostCounts', () => {
	it('czyta liczby wpisów i odrzuca śmieci', () => {
		expect(parseCategoryPostCounts('{"aktualnosci":3,"odpady":0}')).toEqual({
			aktualnosci: 3,
			odpady: 0,
		});
		expect(parseCategoryPostCounts('{"x":"3"}')).toEqual({});
		expect(parseCategoryPostCounts('nie-json')).toEqual({});
		expect(parseCategoryPostCounts(undefined)).toEqual({});
	});
});

describe('isLastCategoryRow', () => {
	it('blokuje usunięcie jedynej kategorii', () => {
		expect(isLastCategoryRow(1)).toBe(true);
		expect(isLastCategoryRow(0)).toBe(true);
		expect(isLastCategoryRow(2)).toBe(false);
	});
});

describe('categoryRowPostCount', () => {
	it('bierze licznik ze starego slugu, potem z bieżącego', () => {
		const counts = { odpady: 4, 'gospodarka-odpadami': 0 };
		expect(categoryRowPostCount(counts, 'odpady', 'gospodarka-odpadami')).toBe(4);
		expect(categoryRowPostCount(counts, '', 'aktualnosci')).toBe(0);
	});
});
