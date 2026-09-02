import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubConfig } from '@/lib/publish/github-api';
import { shouldRefusePublish } from '@/lib/sync/policy';
import { buildSanitizedPageMarkdown, prepareSitePagePublish } from './publish-guard';
import type { SitePageForPublish } from './types';

const gh = vi.hoisted(() => ({
	getGitHubFileText: vi.fn(),
	getGitHubFile: vi.fn(),
}));

vi.mock('@/lib/publish/github-api', () => ({
	getGitHubFileText: gh.getGitHubFileText,
	getGitHubFile: gh.getGitHubFile,
}));

const cfg: GitHubConfig = {
	owner: 'o',
	repo: 'r',
	branch: 'main',
	contentPath: 'src/content/news',
	contentLayout: 'folder',
	assetPublicBase: 'post-files',
};

const page: SitePageForPublish = {
	id: 'p1',
	site_id: 's1',
	title: 'Harmonogram',
	slug: 'harmonogram',
	path_prefix: 'odpady',
	content_md: '',
	external_id: null,
};

describe('publikacja strony — ochrona origin', () => {
	it('odmawia gdy remote jest bogatszy a Omni puste', () => {
		expect(shouldRefusePublish('', '[📄 plik](./a.pdf)')).toBe(true);
	});

	it('pozwala gdy remote nie istnieje', () => {
		expect(shouldRefusePublish('', null)).toBe(false);
	});

	it('pozwala gdy Omni ma własną treść', () => {
		expect(shouldRefusePublish('Nowa wersja', 'Stara wersja')).toBe(false);
	});
});

describe('prepareSitePagePublish', () => {
	beforeEach(() => {
		gh.getGitHubFileText.mockReset();
		gh.getGitHubFile.mockReset();
	});

	it('odmawia remote_richer gdy Omni jest puste a plik na origin ma treść', async () => {
		gh.getGitHubFileText.mockResolvedValue('---\ntitle: Live\n---\n\n[📄 plik](./a.pdf)\n');

		const result = await prepareSitePagePublish(cfg, 'tok', {}, page, '---\n---\n');

		expect(result).toEqual({ ok: false, error: 'remote_richer' });
		expect(gh.getGitHubFile).not.toHaveBeenCalled();
	});

	it('pomija zapis gdy plik na origin jest identyczny', async () => {
		const filled = { ...page, content_md: 'Harmonogram rejonów' };
		const body = buildSanitizedPageMarkdown(filled, filled.content_md);
		gh.getGitHubFileText.mockResolvedValue(body);
		gh.getGitHubFile.mockResolvedValue({ sha: 'blob-same', path: 'src/content/pages/odpady/harmonogram/index.md' });

		const result = await prepareSitePagePublish(cfg, 'tok', {}, filled, body);

		expect(result).toMatchObject({
			ok: true,
			skipWrite: true,
			remoteSha: 'blob-same',
			filePath: 'src/content/pages/odpady/harmonogram/index.md',
		});
	});

	it('pozwala utworzyć nowy plik gdy origin nic nie ma', async () => {
		const filled = { ...page, content_md: 'Nowa strona' };
		const body = buildSanitizedPageMarkdown(filled, filled.content_md);
		gh.getGitHubFileText.mockResolvedValue(null);

		const result = await prepareSitePagePublish(cfg, 'tok', {}, filled, body);

		expect(result).toMatchObject({ ok: true, skipWrite: false, remoteSha: null });
		expect(gh.getGitHubFile).not.toHaveBeenCalled();
	});
});
