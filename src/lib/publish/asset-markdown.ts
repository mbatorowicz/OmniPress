import { pdfEmbedHtml as buildPdfEmbedHtml } from '@/lib/pdf-viewer/embed-html';

export type AssetDisplayMode = 'link' | 'embed';

export type AssetForDisplay = {
	filename: string;
	mime_type: string;
	display_mode: AssetDisplayMode;
	/** URL w treści przed publikacją (np. Supabase public). */
	sourceUrl: string;
	/** URL po publikacji (np. ./plik.pdf). */
	publishUrl: string;
};

const PDF_MIME = 'application/pdf';
const EMBED_BLOCK_RE =
	/<div class="op-pdf-viewer"[^>]*>[\s\S]*?<\/div>(?:\s*<script type="module" src="\/omnipress\/pdf-viewer\.js"><\/script>)?/g;

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function pdfEmbedHtml(src: string, title: string, forPublish = false): string {
	return buildPdfEmbedHtml(src, title, undefined, forPublish);
}

function pdfLinkPattern(filename: string, url?: string): RegExp {
	const name = escapeRegex(filename);
	if (url) {
		return new RegExp(`\\[📄\\s*${name}\\]\\(${escapeRegex(url)}\\)`, 'g');
	}
	return new RegExp(`\\[📄\\s*${name}\\]\\([^)]+\\)`, 'g');
}

/** Zamienia linki PDF (embed) na blok podglądu PDF.js w Markdown / HTML. */
export function applyAssetDisplayToMarkdown(
	contentMd: string,
	assets: AssetForDisplay[],
	options?: { forPublish?: boolean },
): string {
	const forPublish = options?.forPublish ?? false;
	let out = contentMd;
	for (const asset of assets) {
		if (asset.mime_type !== PDF_MIME || asset.display_mode !== 'embed') continue;
		const embed = pdfEmbedHtml(asset.publishUrl, asset.filename, forPublish);
		out = out.replace(pdfLinkPattern(asset.filename, asset.sourceUrl), embed);
		out = out.replace(pdfLinkPattern(asset.filename), embed);
	}
	return out;
}

/** Dzieli treść na segmenty Markdown i gotowe bloki embed. */
export function segmentContentForRender(content: string): Array<{ type: 'md' | 'embed'; value: string }> {
	const segments: Array<{ type: 'md' | 'embed'; value: string }> = [];
	const re = new RegExp(EMBED_BLOCK_RE.source, 'g');
	let lastIndex = 0;
	for (const match of content.matchAll(re)) {
		const index = match.index ?? 0;
		if (index > lastIndex) {
			segments.push({ type: 'md', value: content.slice(lastIndex, index) });
		}
		segments.push({ type: 'embed', value: match[0] });
		lastIndex = index + match[0].length;
	}
	if (lastIndex < content.length) {
		segments.push({ type: 'md', value: content.slice(lastIndex) });
	}
	if (segments.length === 0) segments.push({ type: 'md', value: content });
	return segments;
}
