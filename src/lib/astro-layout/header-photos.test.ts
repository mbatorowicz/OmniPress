import { describe, expect, it } from 'vitest';
import { isSafeSiteHref, parsePhotoUrls } from './header-photos';

describe('header photos', () => {
	it('akceptuje ścieżki względne i http(s)', () => {
		expect(isSafeSiteHref('/img/lot-ptaka/IMG_0787.jpg')).toBe(true);
		expect(isSafeSiteHref('https://cdn.example/a.jpg')).toBe(true);
		expect(isSafeSiteHref('http://cdn.example/a.jpg')).toBe(true);
	});

	it('odrzuca javascript, protocol-relative i puste', () => {
		expect(isSafeSiteHref('javascript:alert(1)')).toBe(false);
		expect(isSafeSiteHref('//evil.example/x.jpg')).toBe(false);
		expect(isSafeSiteHref('')).toBe(false);
		expect(isSafeSiteHref('data:image/gif;base64,xx')).toBe(false);
	});

	it('parsePhotoUrls zostawia pustą tablicę i odcina niebezpieczne', () => {
		expect(parsePhotoUrls(undefined)).toBeUndefined();
		expect(parsePhotoUrls([])).toEqual([]);
		expect(
			parsePhotoUrls(['/img/a.jpg', 'javascript:x', '  /img/b.jpg  ', '//host/c.jpg']),
		).toEqual(['/img/a.jpg', '/img/b.jpg']);
	});
});
