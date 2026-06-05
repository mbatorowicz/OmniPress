import { describe, expect, it } from 'vitest';
import { validateDestinationConfig } from './destinations';

describe('validateDestinationConfig', () => {
	it('wymaga owner/repo dla GitHub', () => {
		expect(validateDestinationConfig('github_astro', { repo: '' })).toBe('config_repo');
		expect(validateDestinationConfig('github_astro', { repo: 'org/site.git' })).toBeNull();
	});
});
