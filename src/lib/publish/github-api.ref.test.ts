import { describe, expect, it } from 'vitest';
import { gitBranchRefUrls } from './github-api';

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
