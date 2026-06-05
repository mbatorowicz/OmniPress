import { describe, expect, it } from 'vitest';
import { validateDestinationConfig } from './destinations';
import { isValidSlug, normalizeSlug } from './slug';

describe('unit form validation', () => {
	it('normalizuje slug jednostki', () => {
		expect(isValidSlug(normalizeSlug('UG Miedzna'))).toBe(true);
	});

	it('wymaga repozytorium GitHub', () => {
		expect(validateDestinationConfig('github_astro', {})).toBe('config_repo');
	});
});
