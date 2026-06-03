import { describe, expect, it } from 'vitest';
import { buildAstroMarkdown } from './frontmatter';

describe('buildAstroMarkdown', () => {
	it('dodaje frontmatter Astro', () => {
		const md = buildAstroMarkdown('Tytuł', '# Treść', '2026-06-03T12:00:00Z');
		expect(md).toContain('title: "Tytuł"');
		expect(md).toContain('pubDate: 2026-06-03');
		expect(md).toContain('# Treść');
	});
});
