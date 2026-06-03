import { describe, expect, it } from 'vitest';
import { isValidSlug, normalizeSlug } from './slug';

describe('createOrganizationalUnit inputs', () => {
	it('normalizuje slug jednostki', () => {
		expect(isValidSlug(normalizeSlug('UG Miedzna'))).toBe(true);
	});
});
