import { describe, expect, it } from 'vitest';
import { readHomeTileHeight, HOME_TILE_HEIGHT_MIN, HOME_TILE_HEIGHT_MAX } from './home-feed';

describe('readHomeTileHeight', () => {
	it('zwraca liczbę całkowitą w zakresie 200–600', () => {
		expect(readHomeTileHeight(320)).toBe(320);
		expect(readHomeTileHeight('280')).toBe(280);
		expect(readHomeTileHeight(320.7)).toBe(320);
	});

	it('odrzuca wartości poza zakresem', () => {
		expect(readHomeTileHeight(HOME_TILE_HEIGHT_MIN - 1)).toBeUndefined();
		expect(readHomeTileHeight(HOME_TILE_HEIGHT_MAX + 1)).toBeUndefined();
		expect(readHomeTileHeight(0)).toBeUndefined();
	});

	it('odrzuca nieprawidłowe wartości', () => {
		expect(readHomeTileHeight('')).toBeUndefined();
		expect(readHomeTileHeight('abc')).toBeUndefined();
		expect(readHomeTileHeight(null)).toBeUndefined();
	});
});
