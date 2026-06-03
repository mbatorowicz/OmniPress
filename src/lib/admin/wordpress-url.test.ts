import { describe, expect, it } from 'vitest';
import { resolveWpRestV2Base, wordpressSiteDisplayUrl } from './wordpress-url';

describe('resolveWpRestV2Base', () => {
	it('dodaje /wp-json/wp/v2 do adresu głównego', () => {
		expect(resolveWpRestV2Base('https://gmina-miedzna.pl/')).toBe(
			'https://gmina-miedzna.pl/wp-json/wp/v2',
		);
	});

	it('normalizuje pełny REST API', () => {
		expect(resolveWpRestV2Base('https://gmina-miedzna.pl/wp-json/wp/v2/')).toBe(
			'https://gmina-miedzna.pl/wp-json/wp/v2',
		);
	});

	it('normalizuje /wp-json bez /wp/v2', () => {
		expect(resolveWpRestV2Base('https://example.com/wp-json')).toBe(
			'https://example.com/wp-json/wp/v2',
		);
	});
});

describe('wordpressSiteDisplayUrl', () => {
	it('ukrywa ścieżkę wp-json w UI', () => {
		expect(
			wordpressSiteDisplayUrl({ wp_rest_base: 'https://gmina-miedzna.pl/wp-json/wp/v2' }),
		).toBe('https://gmina-miedzna.pl');
	});
});
