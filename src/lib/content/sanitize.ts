import { pdfEmbedHtml } from '@/lib/pdf-viewer/embed-html';

const EDITOR_ALLOWED_TAGS = new Set([
	'p',
	'br',
	'strong',
	'em',
	'b',
	'i',
	'h2',
	'h3',
	'ul',
	'ol',
	'li',
	'a',
	'blockquote',
]);

const PUBLISH_ALLOWED_TAGS = new Set([
	...EDITOR_ALLOWED_TAGS,
	'h1',
	'h4',
	'h5',
	'h6',
	'img',
	'div',
]);

const DANGEROUS_URL_RE = /^\s*(javascript|data|vbscript|file):/i;

const PDF_EMBED_BLOCK_RE =
	/<div class="op-pdf-viewer"[^>]*>[\s\S]*?<\/div>(?:\s*<script type="module" src="\/omnipress\/pdf-viewer\.js"><\/script>)?/g;

/** Bezpieczny href/src — http(s), mailto, tel, ścieżki względne, kotwice. */
export function isSafeUrl(url: string): boolean {
	const trimmed = url.trim();
	if (!trimmed) return false;
	if (DANGEROUS_URL_RE.test(trimmed)) return false;
	if (/^[\x00-\x1f]/.test(trimmed)) return false;
	if (trimmed.startsWith('#')) return true;
	if (trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('/')) return true;
	if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return true;
	return false;
}

type SanitizeHtmlOptions = {
	allowedTags?: Set<string>;
	allowPdfViewerScript?: boolean;
};

/** Whitelist tagów HTML — usuwa skrypty, iframe i niebezpieczne atrybuty. */
export function sanitizeHtml(html: string, options: SanitizeHtmlOptions = {}): string {
	const allowed = options.allowedTags ?? PUBLISH_ALLOWED_TAGS;
	let out = html
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
		.replace(/<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
		.replace(/<(iframe|object|embed)\b[^>]*\/?>/gi, '');

	if (options.allowPdfViewerScript) {
		out = out.replace(
			/<script type="module" src="\/omnipress\/pdf-viewer\.js"><\/script>/gi,
			'{{OP_PDF_SCRIPT}}',
		);
	}

	out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, attrs, inner) => {
		const href = attrs.match(/\shref="([^"]+)"/i)?.[1];
		if (!href || !isSafeUrl(href)) return inner;
		return `<a href="${href}" rel="noopener noreferrer">${inner}</a>`;
	});

	out = out.replace(/<img\b([^>]*)\/?>/gi, (_, attrs) => {
		if (!allowed.has('img')) return '';
		const src = attrs.match(/\ssrc="([^"]+)"/i)?.[1];
		const alt = attrs.match(/\salt="([^"]*)"/i)?.[1] ?? '';
		if (!src || !isSafeUrl(src)) return '';
		return `<img src="${src}" alt="${alt}" loading="lazy" />`;
	});

	out = out.replace(/<div\b([^>]*)>[\s\S]*?<\/div>/gi, (match, attrs) => {
		if (!allowed.has('div')) return '';
		const className = attrs.match(/\sclass="([^"]+)"/i)?.[1];
		if (className !== 'op-pdf-viewer') return '';
		const src = attrs.match(/\sdata-op-pdf-src="([^"]+)"/i)?.[1];
		const title = attrs.match(/\sdata-op-pdf-title="([^"]*)"/i)?.[1] ?? '';
		const labels = attrs.match(/\sdata-op-pdf-labels="([^"]*)"/i)?.[1] ?? '';
		if (!src || !isSafeUrl(src)) return '';
		return (
			`<div class="op-pdf-viewer" data-op-pdf-src="${src}" ` +
			`data-op-pdf-title="${title}" data-op-pdf-labels="${labels}"></div>`
		);
	});

	out = out.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag: string) => {
		const lower = tag.toLowerCase();
		if (lower === 'a' || lower === 'img' || lower === 'div') return match;
		if (!allowed.has(lower)) return '';
		if (/^<\//.test(match)) return `</${lower}>`;
		return `<${lower}>`;
	});

	if (options.allowPdfViewerScript) {
		out = out.replace(/\{\{OP_PDF_SCRIPT\}\}/g, '<script type="module" src="/omnipress/pdf-viewer.js"></script>');
	}

	return out;
}

/** HTML do edytora WYSIWYG — węższa whitelist niż publikacja. */
export function sanitizeEditorHtml(html: string): string {
	return sanitizeHtml(html, { allowedTags: EDITOR_ALLOWED_TAGS });
}

/** Usuwa niebezpieczne URL-e w składni Markdown link/obraz. */
export function sanitizeMarkdownUrls(md: string): string {
	let result = '';
	let i = 0;

	while (i < md.length) {
		const isImage = md[i] === '!';
		const bracketStart = isImage ? i + 1 : i;
		if (md[bracketStart] === '[') {
			const bracketEnd = md.indexOf(']', bracketStart + 1);
			if (bracketEnd !== -1 && md[bracketEnd + 1] === '(') {
				const label = md.slice(bracketStart + 1, bracketEnd);
				let depth = 1;
				let j = bracketEnd + 2;
				while (j < md.length && depth > 0) {
					if (md[j] === '(') depth += 1;
					else if (md[j] === ')') depth -= 1;
					j += 1;
				}
				if (depth === 0) {
					const url = md.slice(bracketEnd + 2, j - 1).trim();
					if (isSafeUrl(url)) {
						result += `${isImage ? '!' : ''}[${label}](${url})`;
					} else if (!isImage) {
						result += label;
					}
					i = j;
					continue;
				}
			}
		}
		result += md[i];
		i += 1;
	}

	return result;
}

function sanitizePdfEmbedBlock(block: string, forPublish: boolean): string {
	const src = block.match(/data-op-pdf-src="([^"]*)"/)?.[1];
	const title = block.match(/data-op-pdf-title="([^"]*)"/)?.[1] ?? '';
	if (!src || !isSafeUrl(src)) return '';
	return pdfEmbedHtml(src, title, undefined, forPublish);
}

function stripRawHtmlTags(text: string, allowedTags: Set<string>): string {
	return text.replace(/<[^>]+>/g, (tag) => sanitizeHtml(tag, { allowedTags }));
}

const PDF_PLACEHOLDER = '\uE000PDF:';

/** Sanityzacja treści zapisywanej w bazie (szkic / import). */
export function sanitizeStorageMarkdown(md: string): string {
	const preserved: string[] = [];
	let work = md.replace(PDF_EMBED_BLOCK_RE, (block) => {
		const safe = sanitizePdfEmbedBlock(block, false);
		if (!safe) return '';
		preserved.push(safe);
		return `${PDF_PLACEHOLDER}${preserved.length - 1}\uE001`;
	});

	work = stripRawHtmlTags(work, EDITOR_ALLOWED_TAGS);
	work = sanitizeMarkdownUrls(work);

	return work.replace(/\uE000PDF:(\d+)\uE001/g, (_, index: string) => preserved[Number(index)] ?? '');
}

/** Sanityzacja tuż przed publikacją na GitHub (z blokami PDF embed). */
export function sanitizePublishMarkdown(md: string): string {
	const preserved: string[] = [];
	let work = md.replace(PDF_EMBED_BLOCK_RE, (block) => {
		const safe = sanitizePdfEmbedBlock(block, true);
		if (!safe) return '';
		preserved.push(safe);
		return `${PDF_PLACEHOLDER}${preserved.length - 1}\uE001`;
	});

	work = stripRawHtmlTags(work, PUBLISH_ALLOWED_TAGS);
	work = sanitizeMarkdownUrls(work);

	return work.replace(/\uE000PDF:(\d+)\uE001/g, (_, index: string) => preserved[Number(index)] ?? '');
}
