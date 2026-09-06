import { sanitizeHtml as sanitizeHtmlCore } from '@/lib/content/sanitize';

export { isSafeUrl, sanitizeEditorHtml, sanitizePublishMarkdown, sanitizeStorageMarkdown } from '@/lib/content/sanitize';
export { markdownToSafeHtml } from '@/lib/content/render-markdown';

/** @deprecated alias — użyj sanitizeHtml z tego modułu lub @/lib/content/sanitize */
export function sanitizeHtml(html: string): string {
	return sanitizeHtmlCore(html);
}
