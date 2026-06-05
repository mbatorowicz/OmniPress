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

	it('dodaje cover, galerię i excerpt (folder)', () => {
		const md = buildAstroMarkdown('Tytuł', 'Treść', '2026-06-03T12:00:00Z', 'folder', {
			slug: 'aktualnosci',
			name: 'Aktualności',
			coverImage: './01.jpg',
			galleryImages: ['./02.jpg', './03.jpg'],
			excerpt: 'Krótki opis',
		});
		expect(md).toContain('coverImage: "./01.jpg"');
		expect(md).toContain('galleryImages: ["./02.jpg", "./03.jpg"]');
		expect(md).toContain('excerpt: "Krótki opis"');
		expect(md).toContain('Treść');
	});
});
