/**
 * Osierocony nagłówek z migracji WP. Szablon Astro renderuje „Galeria zdjęć”
 * w komponencie galerii — drugi napis w treści to duplikat.
 */

export function stripLegacyGalleryHeading(md: string): string {
	return md
		.replace(/^#{1,6}[ \t]*Galeria zdjęć[ \t]*:?[ \t]*$/gim, '')
		.replace(/^Galeria zdjęć[ \t]*:?[ \t]*$/gim, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
