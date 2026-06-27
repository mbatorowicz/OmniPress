import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const COLOR_UTILITY =
	/\b(text|bg|border|divide|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|amber|sky|violet|blue|green)-\d+/;

describe('lint-ui-classes patterns', () => {
	it('wykrywa text-slate-*', () => {
		expect('class="text-slate-600"'.match(COLOR_UTILITY)?.[0]).toBe('text-slate-600');
	});

	it('pomija ui-*', () => {
		expect('class="ui-muted"'.match(COLOR_UTILITY)).toBeNull();
	});

	it('skrypt lint-ui-classes istnieje', () => {
		const script = readFileSync(join(process.cwd(), 'scripts/lint-ui-classes.mjs'), 'utf8');
		expect(script).toContain('lint-ui-classes');
	});
});
