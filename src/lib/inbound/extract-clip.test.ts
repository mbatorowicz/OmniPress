import { describe, expect, it } from 'vitest';
import { ATTACHMENT_TEXT_LIMIT, clipText } from './extract-clip';

describe('clipText', () => {
	it('zbija białe znaki i obcina do limitu', () => {
		expect(clipText('  ala \n  ma   kota  ')).toBe('ala ma kota');
		expect(clipText('x'.repeat(ATTACHMENT_TEXT_LIMIT + 10)).length).toBe(ATTACHMENT_TEXT_LIMIT);
		expect(clipText('')).toBe('');
	});
});
