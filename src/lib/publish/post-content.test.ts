import { describe, expect, it } from 'vitest';
import {
	markdownToPlainExcerpt,
	parseImageRefsFromMarkdown,
	prepareAstroPostContent,
	stripImageMarkdown,
} from './post-content';

describe('parseImageRefsFromMarkdown', () => {
	it('zbiera obrazki w kolejności', () => {
		const md = 'Tekst\n\n![a](https://x/a.jpg)\n\n![b](./b.png)';
		expect(parseImageRefsFromMarkdown(md).map((r) => r.url)).toEqual([
			'https://x/a.jpg',
			'./b.png',
		]);
	});

	it('pomija PDF w składni linku', () => {
		const md = '[📄 x.pdf](https://x/x.pdf)\n\n![z](z.jpg)';
		expect(parseImageRefsFromMarkdown(md)).toHaveLength(1);
	});
});

describe('prepareAstroPostContent', () => {
	it('pierwsze zdjęcie to cover, reszta galeria, treść bez obrazków', () => {
		const md = 'Wstęp do wpisu.\n\n![one](./1.jpg)\n\n![two](./2.jpg)\n\nKoniec.';
		const out = prepareAstroPostContent(md);
		expect(out.coverImage).toBe('./1.jpg');
		expect(out.galleryImages).toEqual(['./2.jpg']);
		expect(out.bodyMd).not.toContain('![');
		expect(out.bodyMd).toContain('Wstęp');
		expect(out.excerpt).toContain('Wstęp');
	});
});

describe('stripImageMarkdown', () => {
	it('usuwa tylko obrazki markdown', () => {
		expect(stripImageMarkdown('A\n\n![x](y.jpg)\n\nB')).toBe('A\n\nB');
	});
});

describe('markdownToPlainExcerpt', () => {
	it('skraca długi tekst', () => {
		const long = 'a'.repeat(250);
		expect(markdownToPlainExcerpt(long, 200).endsWith('…')).toBe(true);
	});
});
