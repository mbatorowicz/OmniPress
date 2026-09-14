import { describe, expect, it } from 'vitest';
import { humanizeLabel } from './humanize-label';

describe('humanizeLabel', () => {
	it('zamienia nazwę pliku na czytelną etykietę', () => {
		expect(humanizeLabel('Poradnik bezpieczeństwa.pdf')).toBe('Poradnik bezpieczeństwa');
		expect(humanizeLabel('jesień_bez_infekcji_-_ulotka_grypa_2026_2 (1).pdf')).toBe(
			'jesień bez infekcji – ulotka grypa 2026',
		);
		expect(humanizeLabel('!!!Miedzna – Wpływ smogu na Twoje zdrowie')).toBe(
			'Miedzna – Wpływ smogu na Twoje zdrowie',
		);
	});

	it('nie zostawia UUID ani pustki', () => {
		expect(humanizeLabel('8f9d57d2-c515-4e43-b40a-72091f907939.pdf')).toBe('Dokument PDF');
		expect(humanizeLabel('')).toBe('Dokument PDF');
	});

	it('przywraca polskie znaki z ASCII nazwy pliku', () => {
		expect(humanizeLabel('Zalacznik nr 1 wniosek o audyt.pdf')).toBe('Załącznik nr 1 wniosek o audyt');
	});
});
