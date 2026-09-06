import { describe, expect, it } from 'vitest';
import { prepareStorageMarkdown } from './prepare-markdown';

describe('prepareStorageMarkdown', () => {
	it('scala złamane wiersze po sanityzacji', () => {
		const md =
			'“W dniu 9 sierpnia 2026 r., podczas XIII Uczty Pierogowej na placu\n\n' +
			'szkolnym w Miedznie przy ul. Kościelnej 15.”';
		expect(prepareStorageMarkdown(md)).toBe(
			'“W dniu 9 sierpnia 2026 r., podczas XIII Uczty Pierogowej na placu szkolnym w Miedznie przy ul. Kościelnej 15.”',
		);
	});
});
