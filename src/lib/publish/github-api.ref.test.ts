import { describe, expect, it } from 'vitest';
import { gitBranchRefUrls, httpStatusFromError, isGitHubRetryable } from './github-api';

const cfg = {
	owner: 'mbatorowicz',
	repo: 'gmina-miedzna.pl',
	branch: 'main',
	contentPath: 'src/content/news',
	contentLayout: 'folder' as const,
	assetPublicBase: 'post-files',
};

describe('gitBranchRefUrls', () => {
	it('GET i PATCH używają różnych ścieżek API GitHub', () => {
		const { get, patch } = gitBranchRefUrls(cfg);
		expect(get).toContain('/git/ref/heads/main');
		expect(patch).toContain('/git/refs/heads/main');
		expect(get).not.toEqual(patch);
	});
});

describe('GitHub conflict / retry helpers', () => {
	it('409 Contents API jest retryable', () => {
		expect(isGitHubRetryable(409)).toBe(true);
	});

	it('parsuje status z komunikatu PUT 409', () => {
		expect(
			httpStatusFromError(
				'GitHub PUT 409: {"message":"is at abc but expected def","status":"409"}',
			),
		).toBe(409);
	});
});
