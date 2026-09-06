import { describe, expect, it } from 'vitest';
import { uploadStagePercent } from './upload-xhr';

describe('uploadStagePercent', () => {
	it('rezerwuje początek i koniec na requesty JSON', () => {
		expect(uploadStagePercent('url')).toBe(5);
		expect(uploadStagePercent('complete')).toBe(95);
		expect(uploadStagePercent('done')).toBe(100);
	});

	it('mapuje postęp PUT na 5–95', () => {
		expect(uploadStagePercent('put', 0)).toBe(5);
		expect(uploadStagePercent('put', 0.5)).toBe(50);
		expect(uploadStagePercent('put', 1)).toBe(95);
	});

	it('przycina ułamek poza 0–1', () => {
		expect(uploadStagePercent('put', -1)).toBe(5);
		expect(uploadStagePercent('put', 2)).toBe(95);
	});
});
