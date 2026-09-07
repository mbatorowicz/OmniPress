import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { PDF_VIEWER_SCRIPT_PATH } from '@/lib/pdf-viewer/types';
import { isSafeUrl } from './sanitize-url';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];
type TextNode = DefaultTreeAdapterMap['textNode'];

export const EDITOR_ALLOWED_TAGS = new Set([
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

export const PUBLISH_ALLOWED_TAGS = new Set([
	...EDITOR_ALLOWED_TAGS,
	'h1',
	'h4',
	'h5',
	'h6',
	'img',
	'div',
]);

const DROP_WITH_CHILDREN = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base']);

export type SanitizeHtmlOptions = {
	allowedTags?: Set<string>;
	allowPdfViewerScript?: boolean;
	/** Markdown: zostaw tekst surowy (`**x**`). HTML: escapuj `&` / `<`. */
	escapeText?: boolean;
};

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function attr(el: Element, name: string): string | undefined {
	return el.attrs.find((item) => item.name === name)?.value;
}

function isElement(node: ChildNode): node is Element {
	return node.nodeName !== '#text' && node.nodeName !== '#comment' && node.nodeName !== '#documentType';
}

function isPdfViewerScript(el: Element): boolean {
	return attr(el, 'type') === 'module' && attr(el, 'src') === PDF_VIEWER_SCRIPT_PATH;
}

function serializeChildren(el: Element, options: Required<SanitizeHtmlOptions>): string {
	return el.childNodes.map((child) => serializeNode(child, options)).join('');
}

function serializeAnchor(el: Element, options: Required<SanitizeHtmlOptions>): string {
	const inner = serializeChildren(el, options);
	if (!options.allowedTags.has('a')) return inner;
	const href = attr(el, 'href');
	if (!href || !isSafeUrl(href)) return inner;
	return `<a href="${escapeAttr(href)}" rel="noopener noreferrer">${inner}</a>`;
}

function serializeImg(el: Element, options: Required<SanitizeHtmlOptions>): string {
	if (!options.allowedTags.has('img')) return '';
	const src = attr(el, 'src');
	const alt = attr(el, 'alt') ?? '';
	if (!src || !isSafeUrl(src)) return '';
	return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />`;
}

function serializePdfDiv(el: Element, options: Required<SanitizeHtmlOptions>): string {
	if (!options.allowedTags.has('div')) return serializeChildren(el, options);
	if (attr(el, 'class') !== 'op-pdf-viewer') return serializeChildren(el, options);
	const src = attr(el, 'data-op-pdf-src');
	const title = attr(el, 'data-op-pdf-title') ?? '';
	const labels = attr(el, 'data-op-pdf-labels') ?? '';
	if (!src || !isSafeUrl(src)) return '';
	return (
		`<div class="op-pdf-viewer" data-op-pdf-src="${escapeAttr(src)}" ` +
		`data-op-pdf-title="${escapeAttr(title)}" data-op-pdf-labels="${escapeAttr(labels)}"></div>`
	);
}

function serializeNode(node: ChildNode, options: Required<SanitizeHtmlOptions>): string {
	if (node.nodeName === '#text') {
		const value = (node as TextNode).value;
		return options.escapeText ? escapeText(value) : value;
	}
	if (node.nodeName === '#comment' || node.nodeName === '#documentType') return '';
	if (!isElement(node)) return '';

	const tag = node.tagName.toLowerCase();
	if (tag === 'script' && options.allowPdfViewerScript && isPdfViewerScript(node)) {
		return `<script type="module" src="${PDF_VIEWER_SCRIPT_PATH}"></script>`;
	}
	if (DROP_WITH_CHILDREN.has(tag)) return '';
	if (tag === 'a') return serializeAnchor(node, options);
	if (tag === 'img') return serializeImg(node, options);
	if (tag === 'div') return serializePdfDiv(node, options);
	if (!options.allowedTags.has(tag)) return serializeChildren(node, options);
	if (tag === 'br') return '<br>';
	return `<${tag}>${serializeChildren(node, options)}</${tag}>`;
}

/** Whitelist tagów — parser całego fragmentu, nigdy tag po tagu. */
export function sanitizeHtml(html: string, options: SanitizeHtmlOptions = {}): string {
	const resolved: Required<SanitizeHtmlOptions> = {
		allowedTags: options.allowedTags ?? PUBLISH_ALLOWED_TAGS,
		allowPdfViewerScript: options.allowPdfViewerScript ?? false,
		escapeText: options.escapeText ?? true,
	};
	const fragment = parseFragment(html);
	return fragment.childNodes.map((node) => serializeNode(node, resolved)).join('');
}

/** HTML do edytora WYSIWYG — węższa whitelist niż publikacja. */
export function sanitizeEditorHtml(html: string): string {
	return sanitizeHtml(html, { allowedTags: EDITOR_ALLOWED_TAGS });
}
