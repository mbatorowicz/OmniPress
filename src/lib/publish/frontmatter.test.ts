import { describe, expect, it } from 'vitest';
import { buildAstroMarkdown } from './frontmatter';

describe('buildAstroMarkdown', () => {
	it('dodaje frontmatter Astro', () => {
		const md = buildAstroMarkdown('Tytuł', '# Treść', '2026-06-03T12:00:00Z', 'flat');
		expect(md).toContain('pubDate: 2026-06-03');
	});

	it('dodaje frontmatter gmina (folder)', () => {
		const md = buildAstroMarkdown('Tytuł', '# Treść', '2026-06-03T12:00:00Z', 'folder', {
			slug: 'gmina',
			name: 'Gmina',
		});
		expect(md).toContain('title: "Tytuł"');
		expect(md).toContain('date: "2026-06-03T12:00:00Z"');
		expect(md).toContain('category: "gmina"');
		expect(md).toContain('categoryName: "Gmina"');
		expect(md).toContain('# Treść');
	});
});
