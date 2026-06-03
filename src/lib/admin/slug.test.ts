import { describe, expect, it } from 'vitest';
import { isValidSlug, normalizeSlug } from './slug';

describe('admin slug', () => {
	it('normalizuje slug', () => {
		expect(normalizeSlug('UG Miedzna')).toBe('ug-miedzna');
	});

	it('akceptuje poprawny slug', () => {
		expect(isValidSlug('ug-miedzna')).toBe(true);
	});

	it('odrzuca zbyt krótki', () => {
		expect(isValidSlug('a')).toBe(false);
	});
});
