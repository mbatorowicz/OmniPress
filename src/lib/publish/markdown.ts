import { sanitizeHtml as sanitizeHtmlCore } from '@/lib/content/sanitize';

export { isSafeUrl, sanitizeEditorHtml, sanitizePublishMarkdown, sanitizeStorageMarkdown } from '@/lib/content/sanitize';

/** @deprecated alias — użyj sanitizeHtml z tego modułu lub @/lib/content/sanitize */
export function sanitizeHtml(html: string): string {
	return sanitizeHtmlCore(html);
}

/** Prosty Markdown → HTML z whitelistą tagów (podgląd wpisu). */
export function markdownToSafeHtml(md: string): string {
	const escaped = md
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	let html = escaped;

	html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
	html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
	html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
	html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
	html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
	html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
	html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
	html = html.replace(
		/!\[([^\]]*)\]\(([^)]+)\)/g,
		'<img src="$2" alt="$1" loading="lazy" />',
	);
	html = html.replace(
		/\[([^\]]+)\]\(([^)]+)\)/g,
		'<a href="$2" rel="noopener noreferrer">$1</a>',
	);

	const blocks = html.split(/\n\n+/).map((block) => {
		const trimmed = block.trim();
		if (!trimmed) return '';
		if (/^<(h[1-6]|ul|ol|blockquote|img)/.test(trimmed)) return trimmed;
		return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
	});

	return sanitizeHtmlCore(blocks.filter(Boolean).join('\n'));
}
