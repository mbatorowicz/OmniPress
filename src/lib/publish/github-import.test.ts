import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseFake, hasEq, stepArgs } from '@/lib/testing/supabase-fake';
import { hashPublishedContent } from '@/lib/sync/policy';
import type { DestinationForPublish } from './types';
import type { GitHubConfig } from './github-api';

const deps = vi.hoisted(() => ({
	getGitHubFileText: vi.fn(),
	findExistingPostId: vi.fn(),
	ensureSuccessPublishLog: vi.fn(),
	syncPostAssetsFromGitHub: vi.fn(),
}));

vi.mock('./github-api', () => ({
	getGitHubFileText: deps.getGitHubFileText,
}));

vi.mock('./import-publish-log', () => ({
	findExistingPostId: deps.findExistingPostId,
	ensureSuccessPublishLog: deps.ensureSuccessPublishLog,
}));

vi.mock('./import-assets', () => ({
	syncPostAssetsFromGitHub: deps.syncPostAssetsFromGitHub,
}));

const cfg: GitHubConfig = {
	owner: 'o',
	repo: 'r',
	branch: 'main',
	contentPath: 'src/content/news',
	contentLayout: 'folder',
	assetPublicBase: 'post-files',
};

const dest: DestinationForPublish = {
	id: 'dest-1',
	name: 'astro',
	type: 'github_astro',
	config: {},
	encrypted_credentials: null,
	is_active: true,
};

const liveMd = `---
title: "Wpis z GitHub"
category: "aktualnosci"
date: "2026-09-01"
---

Treść na origin
`;

describe('importOnePost', () => {
	beforeEach(() => {
		deps.getGitHubFileText.mockReset();
		deps.findExistingPostId.mockReset();
		deps.ensureSuccessPublishLog.mockReset();
		deps.syncPostAssetsFromGitHub.mockReset();
		deps.syncPostAssetsFromGitHub.mockResolvedValue([]);
		deps.ensureSuccessPublishLog.mockResolvedValue(undefined);
	});

	it('nie pobiera treści gdy szkic / kolejka / harmonogram ma treść', async () => {
		const { importOnePost } = await import('./github-import-one');
		for (const status of ['draft', 'pending', 'rejected', 'scheduled'] as const) {
			deps.findExistingPostId.mockResolvedValue('post-1');
			const fake = createSupabaseFake((op) => {
				if (op.table === 'posts' && hasEq(op, 'id', 'post-1')) {
					return {
						data: {
							id: 'post-1',
							status,
							content_md: 'Szkic redaktora',
							live_blob_sha: 'old',
							published_content_sha: hashPublishedContent('Szkic redaktora'),
						},
					};
				}
				return { data: null };
			});

			const result = await importOnePost(
				fake.client,
				cfg,
				'tok',
				dest,
				'site-1',
				'user-1',
				'src/content/news/wpis/index.md',
				'new-blob',
			);

			expect(result, status).toEqual({ action: 'skipped', errors: [] });
		}
		expect(deps.getGitHubFileText).not.toHaveBeenCalled();
		expect(deps.syncPostAssetsFromGitHub).not.toHaveBeenCalled();
	});

	it('wstawia nowy wpis jako published gdy brak rekordu w Omni', async () => {
		deps.findExistingPostId.mockResolvedValue(null);
		deps.getGitHubFileText.mockResolvedValue(liveMd);
		const fake = createSupabaseFake((op) => {
			if (op.table === 'posts' && op.steps.some((step) => step.method === 'insert')) {
				return { data: { id: 'post-new' } };
			}
			return { data: null };
		});

		const { importOnePost } = await import('./github-import-one');
		const result = await importOnePost(
			fake.client,
			cfg,
			'tok',
			dest,
			'site-1',
			'user-1',
			'src/content/news/wpis/index.md',
			'live-blob',
		);

		expect(result).toEqual({ action: 'imported', errors: [] });
		const inserted = fake.calls
			.filter((op) => op.table === 'posts')
			.map((op) => stepArgs(op, 'insert')?.[0])
			.find(Boolean) as Record<string, unknown>;
		expect(inserted).toMatchObject({
			title: 'Wpis z GitHub',
			slug: 'wpis',
			status: 'published',
			live_blob_sha: 'live-blob',
		});
		expect(deps.ensureSuccessPublishLog).toHaveBeenCalled();
	});

	it('aktualizuje opublikowany wpis gdy Omni nie edytował', async () => {
		const published = hashPublishedContent('Stara treść');
		deps.findExistingPostId.mockResolvedValue('post-1');
		deps.getGitHubFileText.mockResolvedValue(liveMd);
		const fake = createSupabaseFake((op) => {
			if (op.table === 'posts' && hasEq(op, 'id', 'post-1') && !op.steps.some((s) => s.method === 'update')) {
				return {
					data: {
						id: 'post-1',
						status: 'published',
						content_md: 'Stara treść',
						live_blob_sha: 'old-blob',
						published_content_sha: published,
					},
				};
			}
			if (op.table === 'posts' && op.steps.some((step) => step.method === 'update')) {
				return { data: { id: 'post-1' } };
			}
			return { data: null };
		});

		const { importOnePost } = await import('./github-import-one');
		const result = await importOnePost(
			fake.client,
			cfg,
			'tok',
			dest,
			'site-1',
			'user-1',
			'src/content/news/wpis/index.md',
			'new-blob',
		);

		expect(result).toEqual({ action: 'updated', errors: [] });
		const patch = stepArgs(
			fake.calls.find((op) => op.table === 'posts' && op.steps.some((s) => s.method === 'update'))!,
			'update',
		)?.[0] as Record<string, unknown>;
		expect(patch).toMatchObject({
			content_md: 'Treść na origin',
			status: 'published',
			live_blob_sha: 'new-blob',
		});
	});
});
