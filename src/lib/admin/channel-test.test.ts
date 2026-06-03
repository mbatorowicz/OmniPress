import { describe, expect, it, vi, afterEach } from 'vitest';
import { testWordPressChannel } from './channel-test';

describe('testWordPressChannel', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('odrzuca pusty adres', async () => {
		const form = new FormData();
		form.set('wp_rest_base', '');
		const supabase = {} as never;
		const result = await testWordPressChannel(supabase, form);
		expect(result.ok).toBe(false);
	});

	it('zgłasza sukces REST bez credentials', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '[]' }),
		);
		const form = new FormData();
		form.set('wp_rest_base', 'https://gmina-miedzna.pl');
		const result = await testWordPressChannel({} as never, form);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.message).toContain('REST API');
	});
});
