import { describe, expect, it } from 'vitest';
import {
	filterGitHubMarkdownPosts,
	listGitHubSiblingAssets,
	parseGitHubRepoConfig,
	type GitHubConfig,
} from './github-api';

describe('parseGitHubRepoConfig', () => {
	it('czyta owner/repo i uzupełnia domyślne wartości', () => {
		expect(parseGitHubRepoConfig({ repo: 'mbatorowicz/gmina-miedzna.pl' })).toEqual({
			owner: 'mbatorowicz',
			repo: 'gmina-miedzna.pl',
			branch: 'main',
			contentPath: 'src/content',
			contentLayout: 'flat',
			assetPublicBase: null,
		});
	});

	it('przyjmuje pełny adres repozytorium wklejony z przeglądarki', () => {
		expect(parseGitHubRepoConfig({ repo: 'https://github.com/owner/repo.git' })).toMatchObject({
			owner: 'owner',
			repo: 'repo',
		});
	});

	it('nadpisuje branch, ścieżkę treści i układ', () => {
		expect(
			parseGitHubRepoConfig({
				repo: 'owner/repo',
				branch: 'develop',
				content_path: 'src/content/news',
				content_layout: 'folder',
			}),
		).toMatchObject({
			branch: 'develop',
			contentPath: 'src/content/news',
			contentLayout: 'folder',
		});
	});

	it('normalizuje bazę assetów bez ukośników brzegowych', () => {
		expect(parseGitHubRepoConfig({ repo: 'o/r', asset_public_base: '/post-files/' })).toMatchObject(
			{ assetPublicBase: 'post-files' },
		);
	});

	it('puste wartości nie kasują domyślnych', () => {
		expect(
			parseGitHubRepoConfig({ repo: 'o/r', branch: '   ', content_path: '', asset_public_base: ' ' }),
		).toMatchObject({ branch: 'main', contentPath: 'src/content', assetPublicBase: null });
	});

	it.each([{ repo: '' }, { repo: 'bezukosnika' }, { repo: 'owner/' }, { repo: '/repo' }, {}])(
		'odrzuca niepoprawną konfigurację %o',
		(config) => {
			expect(parseGitHubRepoConfig(config)).toBeNull();
		},
	);
});

const base: GitHubConfig = {
	owner: 'o',
	repo: 'r',
	branch: 'main',
	contentPath: 'src/content/news',
	contentLayout: 'folder',
	assetPublicBase: 'post-files',
};

const blobs = [
	'src/content/news/wpis/index.md',
	'src/content/news/wpis/foto.jpg',
	'src/content/news/wpis/galeria/duze.jpg',
	'src/content/news/plaski.md',
	'src/content/news/wpis/index.MD',
	'src/pages/index.astro',
	'README.md',
];

describe('filterGitHubMarkdownPosts — układ folder', () => {
	it('bierze wyłącznie index.md wpisów', () => {
		expect(filterGitHubMarkdownPosts(base, blobs)).toEqual([
			'src/content/news/wpis/index.md',
			'src/content/news/wpis/index.MD',
		]);
	});

	it('pomija pliki spoza content_path', () => {
		expect(filterGitHubMarkdownPosts(base, blobs)).not.toContain('README.md');
	});

	it('pomija markdown w podfolderach głębiej niż wpis', () => {
		expect(filterGitHubMarkdownPosts(base, ['src/content/news/wpis/galeria/opis.md'])).toEqual([]);
	});
});

describe('filterGitHubMarkdownPosts — układ flat', () => {
	const flat: GitHubConfig = { ...base, contentLayout: 'flat' };

	it('bierze pliki .md wprost w content_path', () => {
		expect(filterGitHubMarkdownPosts(flat, blobs)).toEqual(['src/content/news/plaski.md']);
	});

	it('pomija wpisy w układzie folderowym', () => {
		expect(filterGitHubMarkdownPosts(flat, blobs)).not.toContain('src/content/news/wpis/index.md');
	});
});

describe('listGitHubSiblingAssets', () => {
	it('zwraca załączniki z folderu wpisu', () => {
		expect(listGitHubSiblingAssets(blobs, 'src/content/news/wpis/index.md')).toEqual([
			'src/content/news/wpis/foto.jpg',
		]);
	});

	it('pomija podfoldery i pliki markdown', () => {
		const assets = listGitHubSiblingAssets(blobs, 'src/content/news/wpis/index.md');
		expect(assets).not.toContain('src/content/news/wpis/galeria/duze.jpg');
		expect(assets).not.toContain('src/content/news/wpis/index.MD');
	});

	it('nie sięga do innych wpisów o podobnej nazwie', () => {
		expect(
			listGitHubSiblingAssets(
				['src/content/news/wpis-2/foto.jpg', 'src/content/news/wpis/foto.jpg'],
				'src/content/news/wpis/index.md',
			),
		).toEqual(['src/content/news/wpis/foto.jpg']);
	});
});
