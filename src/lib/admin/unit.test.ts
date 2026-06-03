import { describe, expect, it } from 'vitest';
import { validateDestinationConfig } from './destinations';
import { isValidSlug, normalizeSlug } from './slug';

describe('unit form validation', () => {
	it('normalizuje slug jednostki', () => {
		expect(isValidSlug(normalizeSlug('UG Miedzna'))).toBe(true);
	});

	it('wymaga wp_rest_base dla WordPress', () => {
		expect(validateDestinationConfig('wordpress', {})).toBe('config_wp_rest_base');
	});
});
