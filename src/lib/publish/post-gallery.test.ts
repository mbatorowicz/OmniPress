import { describe, expect, it } from 'vitest';
import { prepareAstroPostFromGallery } from './post-gallery';

describe('prepareAstroPostFromGallery', () => {
	it('pierwsze zdjęcie z galerii = cover, reszta pod spodem', () => {
		const out = prepareAstroPostFromGallery('Tekst wpisu.', ['./a.jpg', './b.jpg']);
		expect(out.coverImage).toBe('./a.jpg');
		expect(out.galleryImages).toEqual(['./b.jpg']);
		expect(out.bodyMd).toBe('Tekst wpisu.');
		expect(out.excerpt).toContain('Tekst');
	});
});
