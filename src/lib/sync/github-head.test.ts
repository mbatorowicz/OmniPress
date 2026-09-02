import { describe, expect, it } from 'vitest';
import { shouldSkipReconcile } from './github-head';

describe('shouldSkipReconcile', () => {
	it('pomija gdy HEAD się nie zmienił', () => {
		expect(shouldSkipReconcile('abc', 'abc')).toBe(true);
	});

	it('nie pomija przy pierwszym uruchomieniu ani przy nowym HEAD', () => {
		expect(shouldSkipReconcile(null, 'abc')).toBe(false);
		expect(shouldSkipReconcile('old', 'new')).toBe(false);
	});
});
