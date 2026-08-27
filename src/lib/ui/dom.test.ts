import { describe, expect, it } from 'vitest';
import { eventTargetElement } from './dom';

function mockElement(): Element {
	return {
		nodeType: 1,
		closest: () => null,
	} as unknown as Element;
}

function mockEvent(target: unknown): Event {
	return { target } as unknown as Event;
}

describe('eventTargetElement', () => {
	it('zwraca Element dla elementów DOM (HTML, SVG)', () => {
		const el = mockElement();
		expect(eventTargetElement(mockEvent(el))).toBe(el);
	});

	it('zwraca null dla nie-Element', () => {
		expect(eventTargetElement(mockEvent(null))).toBeNull();
		expect(eventTargetElement(mockEvent('text'))).toBeNull();
		expect(eventTargetElement(mockEvent({ nodeType: 3 }))).toBeNull();
	});
});
