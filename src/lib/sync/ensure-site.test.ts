import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake } from '@/lib/testing/supabase-fake';
import { shouldSkipReconcile } from './github-head';

describe('ensureSiteFromGitHub — bramka HEAD', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
	});

	it('HEAD bez zmian = zero fetch body', async () => {
		vi.doMock('@/lib/admin/sites', () => ({
			loadSiteAstroDestination: async () => ({
				id: 'd1',
				name: 'gh',
				type: 'github_astro',
				config: { repo: 'o/r', branch: 'main', content_path: 'src/content/news' },
				encrypted_credentials: null,
				is_active: true,
			}),
		}));
		vi.doMock('@/lib/publish/credentials', () => ({
			decryptDestinationCredentials: async () => ({ token: 't' }),
			isGitHubCredentials: () => true,
		}));
		const listTree = vi.fn();
		vi.doMock('@/lib/publish/github-api', () => ({
			parseGitHubRepoConfig: () => ({
				owner: 'o',
				repo: 'r',
				branch: 'main',
				contentPath: 'src/content/news',
				contentLayout: 'folder',
				assetPublicBase: 'post-files',
			}),
			getBranchHeadCommitSha: async () => 'same-head',
			listGitHubTreeBlobs: listTree,
		}));

		const { client } = createSupabaseFake((op) => {
			if (op.table === 'sites') return { data: { github_reconcile_sha: 'same-head' } };
			return { data: null };
		});

		const { ensureSiteFromGitHub } = await import('./ensure-site');
		const result = await ensureSiteFromGitHub(client, 'site-1', 'user-1');
		expect(result.skipped).toBe(true);
		expect(listTree).not.toHaveBeenCalled();
		expect(shouldSkipReconcile('same-head', 'same-head')).toBe(true);
	});
});
