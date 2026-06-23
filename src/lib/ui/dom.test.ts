import { describe, expect, it } from 'vitest';
import { eventTargetElement } from './dom';

function mockElement(): Element {
	return {
		nodeType: 1,
		closest: () => null,
	} as unknown as Element;
}

describe('eventTargetElement', () => {
	it('zwraca Element dla elementów DOM (HTML, SVG)', () => {
		const el = mockElement();
		expect(eventTargetElement({ target: el } as Event)).toBe(el);
	});

	it('zwraca null dla nie-Element', () => {
		expect(eventTargetElement({ target: null } as Event)).toBeNull();
		expect(eventTargetElement({ target: 'text' } as Event)).toBeNull();
		expect(eventTargetElement({ target: { nodeType: 3 } } as Event)).toBeNull();
	});
});
