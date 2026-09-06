import { marked } from 'marked';
import { sanitizeEditorHtml, sanitizeHtml } from './sanitize';
import { prepareStorageMarkdown } from './prepare-markdown';
import { unwrapHardWrappedMarkdown } from './unwrap-paragraphs';

marked.setOptions({ gfm: true, breaks: true });

function renderMarkdown(md: string, sanitize: (html: string) => string, empty: string): string {
	const normalized = unwrapHardWrappedMarkdown(md);
	if (!normalized.trim()) return empty;
	const html = marked.parse(normalized, { async: false }) as string;
	return sanitize(html.trim() || empty);
}

/** Markdown → HTML edytora (węższa whitelist). */
export function markdownToEditorHtml(md: string): string {
	return renderMarkdown(prepareStorageMarkdown(md), sanitizeEditorHtml, '<p></p>');
}

/** Markdown → HTML podglądu / strony (ta sama konwersja co edytor). */
export function markdownToSafeHtml(md: string): string {
	return renderMarkdown(md, sanitizeHtml, '');
}
