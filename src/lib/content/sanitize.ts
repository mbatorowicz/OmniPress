import { pdfEmbedHtml } from '@/lib/pdf-viewer/embed-html';
import { EDITOR_ALLOWED_TAGS, PUBLISH_ALLOWED_TAGS, sanitizeHtml } from './sanitize-html';
import { isSafeUrl, sanitizeMarkdownUrls } from './sanitize-url';

export { sanitizeEditorHtml, sanitizeHtml } from './sanitize-html';
export { isSafeUrl, sanitizeMarkdownUrls } from './sanitize-url';

const PDF_EMBED_BLOCK_RE =
	/<div class="op-pdf-viewer"[^>]*>[\s\S]*?<\/div>(?:\s*<script type="module" src="\/omnipress\/pdf-viewer\.js"><\/script>)?/g;

const PDF_PLACEHOLDER = '\uE000PDF:';

function sanitizePdfEmbedBlock(block: string, forPublish: boolean): string {
	const src = block.match(/data-op-pdf-src="([^"]*)"/)?.[1];
	const title = block.match(/data-op-pdf-title="([^"]*)"/)?.[1] ?? '';
	if (!src || !isSafeUrl(src)) return '';
	return pdfEmbedHtml(src, title, undefined, forPublish);
}

function sanitizeMarkdown(md: string, allowedTags: Set<string>, forPublish: boolean): string {
	const preserved: string[] = [];
	let work = md.replace(PDF_EMBED_BLOCK_RE, (block) => {
		const safe = sanitizePdfEmbedBlock(block, forPublish);
		if (!safe) return '';
		preserved.push(safe);
		return `${PDF_PLACEHOLDER}${preserved.length - 1}\uE001`;
	});

	work = sanitizeHtml(work, {
		allowedTags,
		allowPdfViewerScript: forPublish,
		escapeText: false,
	});
	work = sanitizeMarkdownUrls(work);

	return work.replace(/\uE000PDF:(\d+)\uE001/g, (_, index: string) => preserved[Number(index)] ?? '');
}

/** Sanityzacja treści zapisywanej w bazie (szkic / import). */
export function sanitizeStorageMarkdown(md: string): string {
	return sanitizeMarkdown(md, EDITOR_ALLOWED_TAGS, false);
}

/** Sanityzacja tuż przed publikacją na GitHub (z blokami PDF embed). */
export function sanitizePublishMarkdown(md: string): string {
	return sanitizeMarkdown(md, PUBLISH_ALLOWED_TAGS, true);
}
