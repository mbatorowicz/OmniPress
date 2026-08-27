import { describe, expect, it } from 'vitest';
import { expandGitHubWithdrawPaths, type GitHubConfig } from './github-api';
import { formatExternalGitHubPath } from './paths';

const cfg: GitHubConfig = {
	owner: 'o',
	repo: 'r',
	branch: 'main',
	contentPath: 'src/content/news',
	contentLayout: 'folder',
	assetPublicBase: null,
};

const blobs = [
	'src/content/news/test/index.md',
	'src/content/news/test/01_foto.jpg',
	'src/content/news/test/doc.pdf',
	'src/content/news/other/index.md',
];

describe('expandGitHubWithdrawPaths', () => {
	it('dodaje assety z folderu wpisu', () => {
		const paths = expandGitHubWithdrawPaths(
			[formatExternalGitHubPath('src/content/news/test/index.md')],
			cfg,
			blobs,
		);
		expect(paths.sort()).toEqual(
			[
				'src/content/news/test/index.md',
				'src/content/news/test/01_foto.jpg',
				'src/content/news/test/doc.pdf',
			].sort(),
		);
	});

	it('usuwa pliki w podfolderach wpisu', () => {
		const paths = expandGitHubWithdrawPaths(
			[formatExternalGitHubPath('src/content/news/tytu/index.md')],
			cfg,
			[...blobs, 'src/content/news/tytu/nested/extra.pdf'],
		);
		expect(paths).toContain('src/content/news/tytu/nested/extra.pdf');
	});
});
