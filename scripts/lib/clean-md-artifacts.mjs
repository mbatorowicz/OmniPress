const SECTION_START =
	/^(Sołectwo|Zakres |Całkowita |Okres realizacji|Wójt |Źródła finansowania|Remont |w tym środki|W świetlicy|Przed budynkiem)/;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PDF_BLOCK_RE = /<div class="op-pdf-viewer"[\s\S]*?<\/div>/g;
const GLUED = [
	[/gospodarstwachrolnych/g, 'gospodarstwach rolnych'],
	[/rolnychna /g, 'rolnych na '],
	[/Mazowszedla /g, 'Mazowsze dla '],
	[/CELOWEGOFUNDUSZ/g, 'CELOWEGO FUNDUSZ'],
];

function foldPl(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function applyGlued(text) {
	let out = text;
	for (const [re, repl] of GLUED) out = out.replace(re, repl);
	return out;
}

export function unescapeYamlScalar(value) {
	return String(value).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

export function humanizePdfTitle(raw, fallback = 'Dokument PDF') {
	let t = String(raw || '')
		.replace(/\\_/g, '_')
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, '&')
		.replace(/\.pdf$/i, '')
		.replace(/!{2,}/g, '')
		.replace(/\s*\(\d+\)\s*$/g, '')
		.trim();
	if (!t || UUID_RE.test(t)) return fallback;
	t = t.replace(/_+/g, ' ');
	t = t.replace(/([a-ząćęłńóśźż])([A-ZĄĆĘŁŃÓŚŹŻ])/g, '$1 $2');
	t = t.replace(/([A-Za-zÀ-žĄĆĘŁŃÓŚŹŻąćęłńóśźż])-(?=[A-Za-zÀ-žĄĆĘŁŃÓŚŹŻąćęłńóśźż])/g, '$1 ');
	t = t.replace(/\s+-\s+/g, ' – ');
	t = t.replace(/^\d{1,2}[a-z]?[.)]\s+/i, '');
	t = t.replace(/^\d{1,2}(?=\s+[a-ząćęłńóśźż])/u, '').trim();
	t = t.replace(/-\d{1,2}$/g, '');
	t = t.replace(/([a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ])(\d{4})$/g, '$1 $2');
	t = t.replace(/\s{2,}/g, ' ').trim();
	if (t.length > 24) t = t.replace(/\s+\d+$/g, '').trim();
	if (/\d{5,}/.test(t)) return fallback;
	if (fallback) {
		const fh = foldPl(t);
		const ff = foldPl(fallback);
		if (fh && ff && (fh === ff || ff.startsWith(fh) || fh.startsWith(ff))) return fallback;
	}
	return t || fallback;
}

function softenHardBreaks(md) {
	return md.replace(/ {2}\n/g, (match, offset, source) => {
		const next = source.slice(offset + 3).split('\n')[0]?.trim() ?? '';
		const prev = (source.slice(0, offset).split('\n').at(-1) ?? '').replace(/ {2}$/, '').trimEnd();
		if (!next) return '\n';
		if (/\*\*/.test(prev) && next.startsWith('**')) return '\n\n';
		if (/^Wójt Gminy/.test(prev) && /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(next)) return '\n';
		if (/^[-–*#>]|\d+\.\s/.test(next) || next.startsWith('<') || next.startsWith('\\') || next.startsWith('\uE000'))
			return '\n';
		if (SECTION_START.test(next)) return '\n\n';
		return ' ';
	});
}

function unwrapWrappedLines(md) {
	const lines = md.split('\n');
	const out = [];
	for (let i = 0; i < lines.length; i += 1) {
		const cur = lines[i];
		const next = lines[i + 1];
		if (next == null) {
			out.push(cur);
			continue;
		}
		const a = cur.trimEnd();
		const b = next.trim();
		const noJoinNext = SECTION_START.test(b) || /^(w tym środki|własne )/.test(b);
		const joinLower =
			!noJoinNext && /[a-ząćęłńóśźż,;]$/.test(a) && /^[a-ząćęłńóśźż]/.test(b);
		const joinTitle =
			a.length > 0 &&
			b.length > 0 &&
			!/[.!?:]$/.test(a) &&
			/^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(b) &&
			!noJoinNext &&
			!/^[-–*#>|\d]/.test(b) &&
			!a.startsWith('<') &&
			!b.startsWith('<') &&
			!a.startsWith('[') &&
			!b.startsWith('[');
		if ((joinLower || joinTitle) && !/^(\s*[-*#>]|\s*\d+\.)/.test(cur) && !next.startsWith('\\')) {
			lines[i + 1] = `${a} ${b}`;
			continue;
		}
		out.push(cur);
	}
	return out.join('\n');
}

function stripTracking(md) {
	return md.replace(/\]\((https?:\/\/[^)]+)\)/g, (full, url) => {
		try {
			const parsed = new URL(url);
			for (const key of [...parsed.searchParams.keys()]) {
				if (/^(gclid|gad_|gbraid|fbclid|utm_)/i.test(key)) parsed.searchParams.delete(key);
			}
			const clean = parsed.searchParams.size
				? parsed.toString()
				: `${parsed.origin}${parsed.pathname}${parsed.hash}`;
			return `](${clean})`;
		} catch {
			return full;
		}
	});
}

function dropDuplicatePdfViewers(md) {
	const srcs = [...md.matchAll(/data-op-pdf-src="\.\/([^"]+)"/g)].map((m) => m[1]);
	const drop = new Set();
	for (const src of srcs) {
		const dup = src.match(/^(.*)-2(\.[a-z0-9]+)$/i);
		if (dup && srcs.includes(dup[1] + dup[2])) drop.add(src);
	}
	if (!drop.size) return md;
	return md.replace(PDF_BLOCK_RE, (block) => {
		const src = block.match(/data-op-pdf-src="\.\/([^"]+)"/)?.[1];
		return src && drop.has(src) ? '' : block;
	});
}

function humanizeDownloadLinks(md, fallbackTitle) {
	const seen = new Set();
	return md.replace(/\[📄\s*([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
		if (seen.has(href)) return '';
		seen.add(href);
		const clean = humanizePdfTitle(label.replace(/\\_/g, '_'), fallbackTitle);
		return `[📄 ${clean}](${href})`;
	});
}

function looksLikeFilename(value) {
	const t = value.trim();
	if (!t) return true;
	if (UUID_RE.test(t.replace(/\.pdf$/i, ''))) return true;
	if (/\.pdf$/i.test(t) || /^https?:\/\//i.test(t)) return true;
	if (/^załączniki:?$/i.test(t)) return true;
	if ((t.match(/_/g) || []).length >= 2) return true;
	if (/^[A-Za-z0-9-]+$/.test(t) && (t.match(/-/g) || []).length >= 3) return true;
	return false;
}

export function cleanPlainText(value) {
	return applyGlued(
		String(value)
			.replace(/\u00a0/g, ' ')
			.replace(/\\-/g, ' ')
			.replace(/\\_/g, '_')
			.replace(/\uFE0F/g, '')
			.replace(/([A-Za-zĄĆĘŁŃÓŚŹŻ])>(\s)/g, '$1$2')
			.replace(/[“„]([^”"]+)[”"]/g, '„$1”')
			.replace(/"([^"]+)"/g, '„$1”')
			.replace(/([!?])([A-ZĄĆĘŁŃÓŚŹŻ])/g, '$1 $2')
			.replace(/([a-ząćęłńóśźż])([A-ZĄĆĘŁŃÓŚŹŻ])/g, '$1 $2')
			.replace(/([A-ZĄĆĘŁŃÓŚŹŻ0-9])(„)/g, '$1 $2')
			.replace(/”([A-ZĄĆĘŁŃÓŚŹŻ])/g, '” $1')
			.replace(/ +([”"])/g, '$1')
			.replace(/pn\.\s*[„“”"]\s*/gi, 'pn. „')
			.replace(/\s+/g, ' ')
			.trim(),
	);
}

export function cleanExcerpt(value, fallbackTitle = '') {
	const cleaned = cleanPlainText(unescapeYamlScalar(value));
	if (looksLikeFilename(cleaned) || cleaned.length < 12) return fallbackTitle || cleaned;
	return cleaned;
}

export function cleanMarkdownArtifacts(md, fallbackTitle = '') {
	const blocks = [];
	let work = dropDuplicatePdfViewers(
		md.replace(/\u00a0/g, ' ').replace(/\uFE0F/g, '').replace(/\r\n/g, '\n'),
	);
	work = work.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
	work = work.replace(PDF_BLOCK_RE, (block) => {
		const titled = block.replace(
			/data-op-pdf-title="([^"]*)"/,
			(_, title) =>
				`data-op-pdf-title="${humanizePdfTitle(title, fallbackTitle).replace(/"/g, '&quot;')}"`,
		);
		blocks.push(titled);
		return `\n\n\uE000PDF${blocks.length - 1}\uE001\n\n`;
	});
	work = work.replace(/ngg\\?_shortcode\\?_\d+\\?_placeholder/gi, '\n\n');
	work = work.replace(/\[[^\]]{30,}\]\(https?:\/\/(?:www\.)?gmina-miedzna\.pl\/[^/]+\/[^)]+\)/g, '');
	work = work.replace(
		/\[www\.gmina-miedzna\.pl\]\(http:\/\/www\.gmina-miedzna\.pl\/?\)/g,
		'[gmina-miedzna.pl](https://gmina-miedzna.pl/)',
	);
	work = work.replace(/http:\/\/(?:www\.)?gmina-miedzna\.pl/g, 'https://gmina-miedzna.pl');
	work = stripTracking(work);
	work = work.replace(/\*\* +\*\*/g, ' ').replace(/\*{3,}/g, '');
	work = work.replace(/ {2}\n\*\*\s*$/gm, '**');
	work = work.replace(/^\\-\s+/gm, '- ');
	work = work.replace(/^(\s*)-\s{2,}/gm, '$1- ');
	work = work.replace(/^(\s*)(\d+\.)\s{2,}/gm, '$1$2 ');
	work = work.replace(/^–\s+/gm, '- ');
	work = work.replace(/ • /g, '\n- ');
	work = work.replace(/^• /gm, '- ');
	work = work.replace(/ +: /g, ': ');
	work = work.replace(/ +:(\n)/g, ':$1');
	work = work.replace(/ ,/g, ',');
	work = work.replace(/,(?=[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])/g, ', ');
	work = work.replace(/\( /g, '(');
	work = work.replace(/ \)/g, ')');
	work = work.replace(/([a-ząćęłńóśźż).])\.([A-ZĄĆĘŁŃÓŚŹŻ])/g, '$1. $2');
	work = work.replace(/([!?])([A-ZĄĆĘŁŃÓŚŹŻ])/g, '$1 $2');
	work = work.replace(/([A-ZĄĆĘŁŃÓŚŹŻ]{4,})([a-ząćęłńóśźż])/g, '$1 $2');
	work = work.replace(/([A-ZĄĆĘŁŃÓŚŹŻ0-9])(„)/g, '$1 $2');
	work = work.replace(/”([A-ZĄĆĘŁŃÓŚŹŻ])/g, '” $1');
	work = work.replace(/ +([”"])/g, '$1');
	work = work.replace(/[“]([^”"]+)[”"]/g, '„$1”');
	work = work.replace(/pn\.\s*[„“”"]\s*/gi, 'pn. „');
	work = work.replace(/„\s+/g, '„');
	work = work.replace(
		/([^\n])\n(Źródła finansowania|Całkowita wartość|Zakres |Okres realizacji|Sołectwo )/g,
		'$1\n\n$2',
	);
	work = work.replace(/(\d)\s*\.\s+(\d{3})/g, '$1 $2');
	work = work.replace(/(\d)\s+\.(\d{3})/g, '$1 $2');
	work = work.replace(/(\d)(m²)/g, '$1 $2');
	work = applyGlued(work);
	work = softenHardBreaks(work);
	work = unwrapWrappedLines(work);
	work = work.replace(/(\S) {2,}(?=\S)/g, '$1 ');
	work = work.replace(/^\*\*\s*$/gm, '');
	work = work.replace(/\uE000PDF(\d+)\uE001/g, (_, i) => blocks[Number(i)] ?? '');
	work = humanizeDownloadLinks(work, fallbackTitle);
	return work.replace(/\n{3,}/g, '\n\n').trim();
}
