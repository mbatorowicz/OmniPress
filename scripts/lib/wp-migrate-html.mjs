import TurndownService from 'turndown';
import { PDF_LABELS, WP } from './wp-migrate-map.mjs';

const turndown = new TurndownService({
	headingStyle: 'atx',
	bulletListMarker: '-',
	emDelimiter: '*',
});
turndown.addRule('lineBreak', { filter: 'br', replacement: () => '  \n' });
turndown.addRule('removeUnsafe', {
	filter: ['script', 'style', 'iframe', 'object', 'embed'],
	replacement: () => '',
});

export function decodeHtml(html) {
	return html
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&#8211;/g, '–')
		.replace(/&#8212;/g, '—')
		.replace(/&#8217;/g, '’')
		.replace(/&#8220;/g, '“')
		.replace(/&#8221;/g, '”')
		.replace(/&#8222;/g, '„')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function yamlQuote(value) {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function slugifyFilename(name) {
	const extMatch = name.match(/(\.[a-z0-9]{2,5})$/i);
	const ext = extMatch ? extMatch[1].toLowerCase() : '';
	const base = (extMatch ? name.slice(0, -ext.length) : name)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/ł/g, 'l')
		.replace(/Ł/g, 'L')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	return `${base || 'plik'}${ext}`;
}

function originalUploadUrl(url) {
	try {
		const u = new URL(url, WP);
		u.pathname = u.pathname.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, '');
		return u.href;
	} catch {
		return url;
	}
}

export function collectContentUrls(html) {
	const found = [];
	const seen = new Set();
	const push = (raw, label) => {
		if (!raw) return;
		const url = originalUploadUrl(raw.startsWith('/') ? `${WP}${raw}` : raw);
		if (!url.includes('/wp-content/uploads/')) return;
		if (seen.has(url)) return;
		seen.add(url);
		found.push({ url, label: decodeHtml(label || '') });
	};

	const fileBlock =
		/<div class="wp-block-file"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
	let m;
	while ((m = fileBlock.exec(html)) !== null) push(m[1], m[2]);

	const embeddoc = /\[embeddoc[^\]]*url=["']([^"']+)["'][^\]]*\]/gi;
	while ((m = embeddoc.exec(html)) !== null) push(m[1], '');

	const hrefs = /(?:href|src|data)=["']([^"']+)["']/gi;
	while ((m = hrefs.exec(html)) !== null) push(m[1], '');

	return found;
}

export function kindFromUrl(url) {
	const path = url.split('?')[0].toLowerCase();
	if (/\.(jpe?g|png|gif|webp)$/.test(path)) return 'image';
	if (path.endsWith('.pdf')) return 'pdf';
	return 'file';
}

export function pdfEmbedHtml(src, title) {
	const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
	return (
		`<div class="op-pdf-viewer" data-op-pdf-src="${esc(src)}" ` +
		`data-op-pdf-title="${esc(title)}" data-op-pdf-labels="${esc(JSON.stringify(PDF_LABELS))}"></div>`
	);
}

export function stripWpUploadLinks(md) {
	return md
		.replace(/\[[^\]]*\]\(https?:\/\/gmina-miedzna\.pl\/wp-content\/[^)]+\)/g, '')
		.replace(/https?:\/\/gmina-miedzna\.pl\/wp-content\/[^\s)]+/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function htmlToMarkdown(html, assets) {
	let work = html
		.replace(/\[embeddoc[^\]]*\]/gi, '')
		.replace(/<div class="wp-block-file"[\s\S]*?<\/div>/gi, '')
		.replace(/<figure[\s\S]*?<\/figure>/gi, '')
		.replace(/<img\b[^>]*>/gi, '');

	const placeholders = [];
	for (const asset of assets) {
		const token = `WPASSET${placeholders.length}ZZ`;
		placeholders.push({ token, asset });
		work += `<p>${token}</p>`;
	}

	let md = turndown.turndown(work).trim();
	for (const { token, asset } of placeholders) {
		const block =
			asset.kind === 'pdf'
				? pdfEmbedHtml(`./${asset.filename}`, asset.label || asset.filename)
				: `[📄 ${asset.label || asset.filename}](./${asset.filename})`;
		md = md.replace(token, block);
	}

	return stripWpUploadLinks(
		md
			.replace(/WPASSET\d+ZZ/g, '')
			.replace(/\n{3,}/g, '\n\n')
			.trim(),
	);
}

export function excerptFrom(html, max = 180) {
	const text = decodeHtml(html);
	if (!text) return '';
	if (text.length <= max) return text;
	return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

export function uniqueFilename(wanted, used) {
	if (!used.has(wanted)) {
		used.add(wanted);
		return wanted;
	}
	const dot = wanted.lastIndexOf('.');
	const base = dot > 0 ? wanted.slice(0, dot) : wanted;
	const ext = dot > 0 ? wanted.slice(dot) : '';
	let i = 2;
	let next = `${base}-${i}${ext}`;
	while (used.has(next)) {
		i += 1;
		next = `${base}-${i}${ext}`;
	}
	used.add(next);
	return next;
}
