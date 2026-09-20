import { describe, expect, it } from 'vitest';
import { fitsVisionBudget, isVisionImageMime, VISION_MAX_FILE_BYTES, VISION_MAX_TOTAL_BYTES } from './vision-model';

describe('vision-model', () => {
	it('przyjmuje obrazy i odrzuca ładunek ponad budżet', () => {
		expect(isVisionImageMime('image/jpeg')).toBe(true);
		expect(isVisionImageMime('application/pdf')).toBe(false);
		expect(fitsVisionBudget(0, 100)).toBe(true);
		expect(fitsVisionBudget(0, VISION_MAX_FILE_BYTES + 1)).toBe(false);
		expect(fitsVisionBudget(VISION_MAX_TOTAL_BYTES - 1, 2)).toBe(false);
	});
});
