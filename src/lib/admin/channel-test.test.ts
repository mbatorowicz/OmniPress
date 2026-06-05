import { describe, expect, it, vi, afterEach } from 'vitest';
import { testGitHubAstroChannel } from './channel-test';

describe('testGitHubAstroChannel', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('odrzuca puste repozytorium', async () => {
		const form = new FormData();
		form.set('repo', '');
		const result = await testGitHubAstroChannel({} as never, form);
		expect(result.ok).toBe(false);
	});

	it('wymaga tokena GitHub', async () => {
		const form = new FormData();
		form.set('repo', 'org/site');
		const result = await testGitHubAstroChannel({} as never, form);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain('token');
	});
});
