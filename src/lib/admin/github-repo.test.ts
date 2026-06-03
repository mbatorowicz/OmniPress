import { describe, expect, it } from 'vitest';
import { normalizeGitHubRepo } from './github-repo';

describe('normalizeGitHubRepo', () => {
	it('usuwa .git', () => {
		expect(normalizeGitHubRepo('mbatorowicz/gmina-miedzna.pl.git')).toBe(
			'mbatorowicz/gmina-miedzna.pl',
		);
	});

	it('parsuje URL HTTPS', () => {
		expect(normalizeGitHubRepo('https://github.com/mbatorowicz/gmina-miedzna.pl.git')).toBe(
			'mbatorowicz/gmina-miedzna.pl',
		);
	});
});
