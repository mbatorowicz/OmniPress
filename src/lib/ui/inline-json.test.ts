import { describe, expect, it } from 'vitest';
import { parseInlineJson, toInlineJson } from './inline-json';

describe('toInlineJson', () => {
	it('serializuje obiekt i escapuje <, żeby nie uciąć tagu script', () => {
		expect(toInlineJson({ html: '<script>x</script>' })).toBe(
			'{"html":"\\u003cscript>x\\u003c/script>"}',
		);
	});
});

describe('parseInlineJson', () => {
	it('odczytuje JSON albo zwraca null', () => {
		expect(parseInlineJson<{ n: number }>('{"n":1}')).toEqual({ n: 1 });
		expect(parseInlineJson('')).toBeNull();
		expect(parseInlineJson('not-json')).toBeNull();
	});
});
