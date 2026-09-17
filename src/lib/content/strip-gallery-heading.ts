/**
 * Osierocony nagłówek z migracji WP. Szablon Astro renderuje „Galeria zdjęć”
 * w komponencie galerii — drugi napis w treści to duplikat.
 */
import { dashboard } from '@/i18n';

function galleryHeadingLineRe(prefix = '') {
	const escaped = dashboard.editor.gallery.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`^${prefix}${escaped}[ \\t]*:?[ \\t]*$`, 'gim');
}

export function stripLegacyGalleryHeading(md: string): string {
	return md
		.replace(galleryHeadingLineRe('#{1,6}[ \\t]*'), '')
		.replace(galleryHeadingLineRe(), '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
