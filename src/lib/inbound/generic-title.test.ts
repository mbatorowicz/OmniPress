import { describe, expect, it } from 'vitest';
import { isGenericTitle, resolveEnrichTitle } from './generic-title';

describe('resolveEnrichTitle', () => {
	it('odrzuca ogólnik i bierze frazę z załącznika', () => {
		expect(isGenericTitle('Plakaty')).toBe(true);
		expect(isGenericTitle('Plakaty o wściekliźnie')).toBe(true);
		expect(isGenericTitle('Plakat szczepień')).toBe(true);
		expect(isGenericTitle('Obowiązek szczepienia psów')).toBe(false);
		expect(isGenericTitle('Wścieklizna - obszar zagrożony i zasady zachowania')).toBe(false);
		expect(
			resolveEnrichTitle('Plakaty', 'Plakaty', ['Obowiązek szczepienia psów i kotów w 2026 r.']),
		).toBe('Obowiązek szczepienia psów i kotów w 2026 r.');
		expect(
			resolveEnrichTitle('Plakaty o wściekliźnie', 'Plakaty', [
				'Wścieklizna — obszar zagrożony i zasady zachowania',
			]),
		).toBe('Wścieklizna — obszar zagrożony i zasady zachowania');
	});
});
