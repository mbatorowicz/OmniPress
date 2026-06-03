import { describe, expect, it } from 'vitest';
import { validateDestinationConfig } from './destinations';

describe('validateDestinationConfig', () => {
	it('wymaga wp_rest_base dla WordPress', () => {
		expect(validateDestinationConfig('wordpress', {})).toBe('config_wp_rest_base');
		expect(validateDestinationConfig('wordpress', { wp_site_url: 'https://gmina-miedzna.pl' })).toBeNull();
	});

	it('wymaga owner/repo dla GitHub', () => {
		expect(validateDestinationConfig('github_astro', { repo: '' })).toBe('config_repo');
		expect(validateDestinationConfig('github_astro', { repo: 'org/site' })).toBeNull();
	});
});
