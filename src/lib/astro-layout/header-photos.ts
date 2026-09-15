/** Pasek zdjęć w nagłówku (`header.brand.photos`) — URL-e, link, sanityzacja. */

export const DEFAULT_HEADER_PHOTO_URLS = [
	'/img/lot-ptaka/IMG_0787.jpg',
	'/img/lot-ptaka/IMG_0776.jpg',
	'/img/lot-ptaka/IMG_0763.jpg',
	'/img/lot-ptaka/IMG_0792.jpg',
	'/img/lot-ptaka/IMG_0719.jpg',
	'/img/lot-ptaka/IMG_0800.jpg',
] as const;

export const DEFAULT_HEADER_PHOTOS_HREF = '/gmina/miedzna-z-lotu-ptaka';

export function isSafeSiteHref(raw: string): boolean {
	const trimmed = raw.trim();
	if (!trimmed || trimmed.includes('\\')) return false;
	if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
	try {
		const url = new URL(trimmed);
		return url.protocol === 'https:' || url.protocol === 'http:';
	} catch {
		return false;
	}
}

/** `undefined` = pole nieobecne (fallback na stronie); tablica — także pusta. */
export function parsePhotoUrls(raw: unknown): string[] | undefined {
	if (!Array.isArray(raw)) return undefined;
	return raw
		.filter((item): item is string => typeof item === 'string')
		.map((item) => item.trim())
		.filter(isSafeSiteHref);
}

export function defaultHeaderPhotosFields() {
	return {
		photos: [...DEFAULT_HEADER_PHOTO_URLS],
		photosHref: DEFAULT_HEADER_PHOTOS_HREF,
	};
}
