import { describe, expect, it } from 'vitest';
import {
	assetBasename,
	parseAstroPostFile,
	slugFromGitHubMarkdownPath,
} from './astro-post-parse';
import { filterGitHubMarkdownPosts, listGitHubSiblingAssets } from './github-api';

describe('parseAstroPostFile', () => {
	it('parsuje wpis folder layout z PDF i kategorią', () => {
		const raw = `---
title: "Zarządzenie wójta"
date: "2026-01-15T10:00:00Z"
author: "Administrator"
category: "informacje"
categoryName: "Informacje"
draft: false
---

Treść z [PDF](./abc.pdf)

<iframe src="./abc.pdf"></iframe>`;

		const parsed = parseAstroPostFile(raw);
		expect(parsed?.title).toBe('Zarządzenie wójta');
		expect(parsed?.categorySlug).toBe('informacje');
		expect(parsed?.draft).toBe(false);
		expect(parsed?.body).toContain('Treść z');
	});

	it('parsuje cover i galerię', () => {
		const raw = `---
title: "Aktualność"
date: "2026-06-01"
category: "aktualnosci"
categoryName: "Aktualności"
coverImage: "./01.jpg"
galleryImages: ["./02.jpg", "./03.jpg"]
excerpt: "Krótki opis"
---

Treść artykułu.`;

		const parsed = parseAstroPostFile(raw);
		expect(parsed?.coverImage).toBe('./01.jpg');
		expect(parsed?.galleryImages).toEqual(['./02.jpg', './03.jpg']);
		expect(parsed?.excerpt).toBe('Krótki opis');
		expect(parsed?.extraCategorySlugs).toEqual([]);
	});

	it('parsuje dodatkowe kategorie z tablicy categories', () => {
		const raw = `---
title: "Smog"
date: "2026-09-06"
category: "mazowsze-bez-smogu"
categoryName: "Mazowsze bez smogu"
categories: ["mazowsze-bez-smogu", "aktualnosci"]
---

Treść.`;

		const parsed = parseAstroPostFile(raw);
		expect(parsed?.categorySlug).toBe('mazowsze-bez-smogu');
		expect(parsed?.extraCategorySlugs).toEqual(['aktualnosci']);
	});
});

describe('slugFromGitHubMarkdownPath', () => {
	it('folder layout', () => {
		expect(
			slugFromGitHubMarkdownPath('src/content/news/zarzadzenia/index.md', 'src/content/news', 'folder'),
		).toBe('zarzadzenia');
	});

	it('flat layout', () => {
		expect(slugFromGitHubMarkdownPath('src/content/post.md', 'src/content', 'flat')).toBe('post');
	});
});

describe('filterGitHubMarkdownPosts', () => {
	it('folder — tylko slug/index.md', () => {
		const paths = filterGitHubMarkdownPosts(
			{
				owner: 'o',
				repo: 'r',
				branch: 'main',
				contentPath: 'src/content/news',
				contentLayout: 'folder',
				assetPublicBase: null,
			},
			[
				'src/content/news/a/index.md',
				'src/content/news/b/readme.md',
				'src/other/x/index.md',
			],
		);
		expect(paths).toEqual(['src/content/news/a/index.md']);
	});
});

describe('listGitHubSiblingAssets', () => {
	it('zwraca pliki obok index.md', () => {
		const assets = listGitHubSiblingAssets(
			[
				'src/content/news/z/index.md',
				'src/content/news/z/file.pdf',
				'src/content/news/z/photo.jpg',
				'src/content/news/other/x.pdf',
			],
			'src/content/news/z/index.md',
		);
		expect(assets).toEqual(['src/content/news/z/file.pdf', 'src/content/news/z/photo.jpg']);
	});
});

describe('assetBasename', () => {
	it('usuwa ./ z początku', () => {
		expect(assetBasename('./abc.pdf')).toBe('abc.pdf');
	});
});
