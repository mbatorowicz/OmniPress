import { describe, expect, it } from 'vitest';
import { slotFormAttr, UNIT_COMPONENTS_FORM_ID } from './layout-form-ids';

describe('layout-form-ids', () => {
	it('slotFormAttr zwraca atrybut form dla id formularza', () => {
		expect(slotFormAttr(UNIT_COMPONENTS_FORM_ID)).toBe(` form="${UNIT_COMPONENTS_FORM_ID}"`);
	});

	it('slotFormAttr zwraca pusty string bez id', () => {
		expect(slotFormAttr(undefined)).toBe('');
	});
});
