import { describe, expect, it } from 'vitest';
import { buildAstroMarkdown } from './frontmatter';
import {
	astroNewsFrontmatterSchema,
	parseRawFrontmatterFields,
} from './news-frontmatter-schema';

describe('news frontmatter contract (↔ repo Astro content.config.ts)', () => {
	it('folder layout — pola z buildAstroMarkdown przechodzą strict schema', () => {
		const md = buildAstroMarkdown('Tytuł wpisu', 'Treść', '2026-08-27T14:00:00Z', 'folder', {
			slug: 'aktualnosci',
			name: 'Aktualności',
			coverImage: './01.jpg',
			galleryImages: ['./02.jpg'],
			excerpt: 'Skrót',
			pinned: true,
		});
		const fields = parseRawFrontmatterFields(md);
		expect(() => astroNewsFrontmatterSchema.parse(fields)).not.toThrow();
	});

	it('folder z dodatkowymi kategoriami — categories przechodzi strict schema', () => {
		const md = buildAstroMarkdown('Tytuł wpisu', 'Treść', '2026-08-27T14:00:00Z', 'folder', {
			slug: 'mazowsze-bez-smogu',
			name: 'Mazowsze bez smogu',
			categories: ['mazowsze-bez-smogu', 'aktualnosci'],
		});
		const fields = parseRawFrontmatterFields(md);
		expect(fields.categories).toEqual(['mazowsze-bez-smogu', 'aktualnosci']);
		expect(() => astroNewsFrontmatterSchema.parse(fields)).not.toThrow();
	});

	it('flat layout — pubDate zamiast date', () => {
		const md = buildAstroMarkdown('Tytuł', 'Treść', '2026-06-03T12:00:00Z', 'flat');
		const fields = parseRawFrontmatterFields(md);
		expect(() => astroNewsFrontmatterSchema.parse(fields)).not.toThrow();
		expect(fields.pubDate).toBe('2026-06-03');
	});

	it('strict schema wychwytuje nieznane pole (runtime Astro tego nie złapie)', () => {
		const fields = {
			title: 'Tytuł',
			date: '2026-01-01T12:00:00.000Z',
			author: 'Administrator',
			category: 'aktualnosci',
			categoryName: 'Aktualności',
			draft: false,
			unknownOmniPressField: 'dryf',
		};
		expect(() => astroNewsFrontmatterSchema.parse(fields)).toThrow();
	});

	it('brak date i pubDate — poza schematem wejściowym, ale wykrywalne przed publikacją', () => {
		const fields = {
			title: 'Tytuł',
			author: 'Administrator',
			category: 'aktualnosci',
			categoryName: 'Aktualności',
			draft: false,
		};
		expect(() => astroNewsFrontmatterSchema.parse(fields)).not.toThrow();
		// Astro transform rzuci błąd przy build — to osobna walidacja w content.config.ts
		expect(fields).not.toHaveProperty('date');
		expect(fields).not.toHaveProperty('pubDate');
	});
});
