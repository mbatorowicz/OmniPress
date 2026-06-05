const ALLOWED_TAGS = new Set([
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'blockquote',
	'div', 'iframe',
]);

/** Prosty Markdown → HTML z whitelistą tagów (eksport WP). */
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

	return sanitizeHtml(blocks.filter(Boolean).join('\n'));
}

export function sanitizeHtml(html: string): string {
	const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
	return withoutScripts.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag: string, attrs: string) => {
		const lower = tag.toLowerCase();
		if (!ALLOWED_TAGS.has(lower)) return '';
		if (lower === 'a') {
			const href = attrs.match(/\shref="([^"]+)"/i)?.[1];
			if (!href || /^\s*javascript:/i.test(href)) return '';
			return `<a href="${href}" rel="noopener noreferrer">`;
		}
		if (lower === 'img') {
			const src = attrs.match(/\ssrc="([^"]+)"/i)?.[1];
			const alt = attrs.match(/\salt="([^"]*)"/i)?.[1] ?? '';
			if (!src || /^\s*javascript:/i.test(src)) return '';
			return `<img src="${src}" alt="${alt}" loading="lazy" />`;
		}
		if (lower === 'div') {
			const className = attrs.match(/\sclass="([^"]+)"/i)?.[1];
			if (className !== 'op-pdf-viewer') return '';
			return '<div class="op-pdf-viewer">';
		}
		if (lower === 'iframe') {
			const src = attrs.match(/\ssrc="([^"]+)"/i)?.[1];
			const title = attrs.match(/\stitle="([^"]*)"/i)?.[1] ?? '';
			if (!src || /^\s*javascript:/i.test(src)) return '';
			return `<iframe src="${src}" title="${title}" loading="lazy"></iframe>`;
		}
		if (/^<\//.test(match)) return `</${lower}>`;
		return `<${lower}>`;
	});
}
