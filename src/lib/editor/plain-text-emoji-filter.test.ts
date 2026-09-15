/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { bindPlainTextEmojiFilter } from './plain-text-emoji-filter';

describe('bindPlainTextEmojiFilter', () => {
	it('zdejmuje emoji z pola tytułu', () => {
		const input = document.createElement('input');
		bindPlainTextEmojiFilter(input);
		input.value = '📅 Festyn 💰';
		input.dispatchEvent(new Event('input'));
		expect(input.value).toBe('Festyn');
	});
});
