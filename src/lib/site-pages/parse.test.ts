import { describe, expect, it } from 'vitest';
import { filterGitHubMarkdownPages, parseSitePageFile, parseSitePagePath } from './parse';

describe('parseSitePagePath', () => {
	it('czyta prefix i slug z folder/index.md', () => {
		expect(parseSitePagePath('src/content/pages', 'src/content/pages/odpady/harmonogram/index.md')).toEqual({
			pathPrefix: 'odpady',
			slug: 'harmonogram',
		});
		expect(parseSitePagePath('src/content/pages', 'src/content/pages/kontakt/index.md')).toEqual({
			pathPrefix: '',
			slug: 'kontakt',
		});
	});
});

describe('filterGitHubMarkdownPages', () => {
	it('bierze tylko index.md na 1–2 poziomach', () => {
		const paths = filterGitHubMarkdownPages('src/content/pages', [
			{ path: 'src/content/pages/odpady/harmonogram/index.md', sha: 'a' },
			{ path: 'src/content/pages/odpady/harmonogram/plik.pdf', sha: 'b' },
			{ path: 'src/content/news/wpis/index.md', sha: 'c' },
			{ path: 'src/content/pages/a/b/c/index.md', sha: 'd' },
		]);
		expect(paths.map((p) => p.path)).toEqual(['src/content/pages/odpady/harmonogram/index.md']);
	});
});

describe('parseSitePageFile', () => {
	it('czyta front-matter i ciało', () => {
		const parsed = parseSitePageFile(
			'---\ntitle: "Harmonogram"\ntype: page\nslug: "harmonogram"\npathPrefix: "odpady"\ndraft: false\n---\n\n[📄 rejon](./a.pdf)\n',
		);
		expect(parsed).toMatchObject({
			title: 'Harmonogram',
			slug: 'harmonogram',
			pathPrefix: 'odpady',
			body: '[📄 rejon](./a.pdf)',
		});
	});
});
