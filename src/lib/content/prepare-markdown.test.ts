import { describe, expect, it } from 'vitest';
import { preparePublishMarkdown, prepareStorageMarkdown } from './prepare-markdown';

describe('prepareStorageMarkdown', () => {
	it('zdejmuje osierocony nagłówek galerii z migracji WP', () => {
		expect(prepareStorageMarkdown('Tekst.\n\n### Galeria zdjęć:\n')).toBe('Tekst.');
	});

	it('scala złamane wiersze po sanityzacji', () => {
		const md =
			'“W dniu 9 sierpnia 2026 r., podczas XIII Uczty Pierogowej na placu\n\n' +
			'szkolnym w Miedznie przy ul. Kościelnej 15.”';
		expect(prepareStorageMarkdown(md)).toBe(
			'“W dniu 9 sierpnia 2026 r., podczas XIII Uczty Pierogowej na placu szkolnym w Miedznie przy ul. Kościelnej 15.”',
		);
	});
});

describe('preparePublishMarkdown', () => {
	it('zdejmuje osierocony nagłówek galerii przed commitem do repo', () => {
		expect(preparePublishMarkdown('Relacja.\n\n### Galeria zdjęć:\n')).toBe('Relacja.');
	});
});
