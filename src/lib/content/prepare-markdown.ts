import { sanitizePublishMarkdown, sanitizeStorageMarkdown } from './sanitize';
import { stripLegacyGalleryHeading } from './strip-gallery-heading';
import { unwrapHardWrappedMarkdown } from './unwrap-paragraphs';

/** Zapis / import: sanityzacja + jeden model akapitów (edytor = podgląd = strona). */
export function prepareStorageMarkdown(md: string): string {
	return stripLegacyGalleryHeading(unwrapHardWrappedMarkdown(sanitizeStorageMarkdown(md)));
}

/** Publikacja na GitHub: to samo co storage, z tagami embed PDF. */
export function preparePublishMarkdown(md: string): string {
	return stripLegacyGalleryHeading(unwrapHardWrappedMarkdown(sanitizePublishMarkdown(md)));
}
