import { describe, expect, it } from 'vitest';
import { stripLegacyGalleryHeading } from './strip-gallery-heading';

describe('stripLegacyGalleryHeading', () => {
	it('zdejmuje nagłówek markdown z dwukropkiem', () => {
		expect(stripLegacyGalleryHeading('Tekst wpisu.\n\n### Galeria zdjęć:\n')).toBe('Tekst wpisu.');
	});

	it('zdejmuje samą linię bez hashy', () => {
		expect(stripLegacyGalleryHeading('Wstęp.\n\nGaleria zdjęć:\n\nKoniec.')).toBe('Wstęp.\n\nKoniec.');
	});

	it('zostawia zdanie z frazą galerii', () => {
		const md = 'Zapraszamy do galerii zdjęć w holu szkoły.';
		expect(stripLegacyGalleryHeading(md)).toBe(md);
	});
});
