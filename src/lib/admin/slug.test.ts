import { describe, expect, it } from 'vitest';
import { isValidSlug, normalizeSlug } from './slug';

describe('admin slug', () => {
	it('normalizuje slug', () => {
		expect(normalizeSlug('UG Miedzna')).toBe('ug-miedzna');
	});

	it('akceptuje poprawny slug', () => {
		expect(isValidSlug('ug-miedzna')).toBe(true);
		expect(isValidSlug('zarzadzenia')).toBe(true);
	});

	it('odrzuca zbyt krótki', () => {
		expect(isValidSlug('a')).toBe(false);
	});

	it.each([
		['ą', 'a'],
		['ć', 'c'],
		['ę', 'e'],
		['ł', 'l'],
		['ń', 'n'],
		['ó', 'o'],
		['ś', 's'],
		['ź', 'z'],
		['ż', 'z'],
		['Ą', 'a'],
		['Ć', 'c'],
		['Ę', 'e'],
		['Ł', 'l'],
		['Ń', 'n'],
		['Ó', 'o'],
		['Ś', 's'],
		['Ź', 'z'],
		['Ż', 'z'],
	])('transliteruje %s → %s', (input, expected) => {
		expect(normalizeSlug(`x${input}y`)).toBe(`x${expected}y`);
	});

	it('normalizuje realne tytuły wpisów', () => {
		expect(normalizeSlug('Ogłoszenie o przetargu')).toBe('ogloszenie-o-przetargu');
		expect(normalizeSlug('Plan Ogólny Gminy Miedzna')).toBe('plan-ogolny-gminy-miedzna');
	});

	it('transliteruje znaki poza polskim alfabetem', () => {
		expect(normalizeSlug('straße')).toBe('strasse');
		expect(normalizeSlug('Bølgen')).toBe('bolgen');
		expect(normalizeSlug('æøå')).toBe('aeoa');
	});
});
