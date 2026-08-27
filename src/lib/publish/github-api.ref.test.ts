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

	it.each([429, 403, 500, 503])('%i jest retryable', (status) => {
		expect(isGitHubRetryable(status)).toBe(true);
	});

	it.each([400, 401, 404, 422])('%i nie jest retryable', (status) => {
		expect(isGitHubRetryable(status)).toBe(false);
	});

	it('parsuje status z komunikatu PUT 409', () => {
		expect(
			httpStatusFromError(
				'GitHub PUT 409: {"message":"is at abc but expected def","status":"409"}',
			),
		).toBe(409);
	});

	it.each([
		['GitHub GET 502: bad gateway', 502],
		['GitHub DELETE 404: not found', 404],
		['GitHub blob 500: server error', 500],
		['GitHub tree 422: unprocessable', 422],
		['GitHub commit POST 409: conflict', 409],
		['GitHub ref GET 403: rate limit', 403],
		['GitHub ref PATCH 409: fast-forward', 409],
		['GitHub contents dir 401: bad credentials', 401],
	])('rozpoznaje status w komunikacie %s', (message, status) => {
		expect(httpStatusFromError(message)).toBe(status);
	});

	it.each(['GitHub PUT: konflikt SHA', 'putGitHubFilesBatch: brak plików', 'ECONNRESET'])(
		'zwraca null dla komunikatu bez statusu: %s',
		(message) => {
			expect(httpStatusFromError(message)).toBeNull();
		},
	);
});
