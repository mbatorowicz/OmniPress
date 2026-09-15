import { describe, expect, it } from 'vitest';
import { buildPagePublishedMarkdown } from './publish-body';
import { editorialPageContent } from './content';
import { resolveSitePageFilePath, sitePageDirFromMarkdownPath } from './paths';
import type { SitePageForPublish } from './types';
import type { PostAsset } from '@/lib/publish/asset-model';

const page: SitePageForPublish = {
	id: 'p1',
	site_id: 's1',
	title: 'Harmonogram',
	slug: 'harmonogram',
	path_prefix: 'odpady',
	content_md: 'Rejony 1, 2 i 3.',
	external_id: null,
};

const pdf: PostAsset = {
	id: 'a1',
	storage_path: 'p1/miedzna-rejon-1.pdf',
	filename: 'Miedzna — rejon 1',
	mime_type: 'application/pdf',
	display_mode: 'embed',
};

describe('buildPagePublishedMarkdown', () => {
	it('dokleja podgląd PDF przy display_mode embed', () => {
		const urlMap = new Map([['/api/posts/p1/assets/a1/file', './miedzna-rejon-1.pdf']]);
		const { markdown, hasPdfEmbed } = buildPagePublishedMarkdown(page, [pdf], urlMap);
		expect(hasPdfEmbed).toBe(true);
		expect(markdown).toContain('class="op-pdf-viewer"');
		expect(markdown).toContain('data-op-pdf-src="./miedzna-rejon-1.pdf"');
		expect(markdown).toContain('Rejony 1, 2 i 3.');
		expect(markdown).not.toContain('[📄');
	});

	it('zostawia link gdy tryb to link', () => {
		const urlMap = new Map([['/api/posts/p1/assets/a1/file', './miedzna-rejon-1.pdf']]);
		const { markdown, hasPdfEmbed } = buildPagePublishedMarkdown(
			page,
			[{ ...pdf, display_mode: 'link' }],
			urlMap,
		);
		expect(hasPdfEmbed).toBe(false);
		expect(markdown).toContain('[📄 Miedzna — rejon 1](./miedzna-rejon-1.pdf)');
		expect(markdown).not.toContain('op-pdf-viewer');
	});
});

describe('editorialPageContent', () => {
	it('zdejmuje linki załączników gdy strona ma listę plików', () => {
		const raw = 'Wstęp.\n\n[📄 Rejon 1](./a.pdf)\n';
		expect(editorialPageContent(raw, true)).toBe('Wstęp.');
		expect(editorialPageContent(raw, false)).toContain('./a.pdf');
	});
});

describe('ścieżki folderu strony', () => {
	it('obcina index.md do katalogu', () => {
		expect(sitePageDirFromMarkdownPath('src/content/pages/odpady/harmonogram/index.md')).toBe(
			'src/content/pages/odpady/harmonogram',
		);
	});

	it('bierze external_id albo składa ścieżkę z prefixu', () => {
		expect(
			resolveSitePageFilePath({}, { path_prefix: 'odpady', slug: 'harmonogram', external_id: null }),
		).toBe('src/content/pages/odpady/harmonogram/index.md');
	});
});
