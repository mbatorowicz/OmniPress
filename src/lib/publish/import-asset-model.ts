/**
 * Czyste reguly importu zalacznikow z repo Astro (bez bazy i HTTP).
 * Operacje na Supabase: `@/lib/publish/import-assets`.
 *
 * Kluczowa asymetria kontraktu: publikacja nazywa plik w repo basenamem
 * `storage_path` (UUID), a nie `filename`. Parowanie lokalne <-> zdalne musi
 * isc po tej samej nazwie, inaczej import dubluje wiersze i kasuje ze Storage
 * plik, ktory sam chwile wczesniej wgral.
 */
import { assetBasename, type ParsedAstroPost } from './astro-post-parse';

const PDF_VIEWER_BLOCK_RE =
	/<div class="op-pdf-viewer"[^>]*>[\s\S]*?<\/div>(?:\s*<script type="module" src="\/omnipress\/pdf-viewer\.js"><\/script>)?/g;

/** Prefiks etykiety linku do zalacznika: 📄 (PDF) albo 📎 (pozostale pliki). */
const FILE_LABEL_PREFIX_RE = /^[\u{1F4C4}\u{1F4CE}]\s*/u;

const RELATIVE_FILE_LINK_RE = /\[[\u{1F4C4}\u{1F4CE}][^\]]*\]\(\.\/[^)]+\)/gu;

/** Ucieczki Markdown w etykiecie linku — `LAS\_Broszura.pdf` to plik `LAS_Broszura.pdf`. */
const MARKDOWN_ESCAPE_RE = /\\([\\`*_{}[\]()#+\-.!])/g;

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function storageBasename(storagePath: string): string {
	return storagePath.split('/').pop() ?? storagePath;
}

export function mimeFromFilename(filename: string): string {
	const lower = filename.toLowerCase();
	if (lower.endsWith('.pdf')) return 'application/pdf';
	if (lower.endsWith('.docx')) {
		return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
	}
	if (lower.endsWith('.gpkg')) return 'application/geopackage+sqlite3';
	if (lower.endsWith('.xlsx')) {
		return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
	}
	if (lower.endsWith('.zip')) return 'application/zip';
	if (lower.endsWith('.png')) return 'image/png';
	if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
	if (lower.endsWith('.webp')) return 'image/webp';
	if (lower.endsWith('.gif')) return 'image/gif';
	return 'application/octet-stream';
}

export function pdfDisplayMode(body: string, filename: string): 'link' | 'embed' {
	const escaped = escapeRegex(filename);
	return new RegExp(
		`(?:iframe[^>]+src=["']\\.\\/${escaped}["']|data-op-pdf-src=["']\\.\\/${escaped}["'])`,
		'i',
	).test(body)
		? 'embed'
		: 'link';
}

export function imageSortOrder(parsed: ParsedAstroPost, filename: string): number {
	const order: string[] = [];
	if (parsed.coverImage) order.push(assetBasename(parsed.coverImage));
	for (const ref of parsed.galleryImages) {
		const base = assetBasename(ref);
		if (!order.includes(base)) order.push(base);
	}
	const idx = order.indexOf(filename);
	return idx >= 0 ? idx : 100;
}

/**
 * Oryginalna nazwa pliku odczytana z opublikowanej tresci — etykieta linku
 * albo tytul bloku podgladu PDF. Bez tego `filename` w bazie zostaje surowym
 * UUID-em, ktory widzi redaktor i ktory trafia na strone przy republikacji.
 */
export function assetLabelFromBody(body: string, blobName: string): string | null {
	const target = escapeRegex(blobName);
	const link = new RegExp(`!?\\[([^\\]]*)\\]\\(\\.\\/${target}\\)`).exec(body);
	const label = link?.[1]
		?.replace(FILE_LABEL_PREFIX_RE, '')
		.replace(MARKDOWN_ESCAPE_RE, '$1')
		.trim();
	if (label) return label;

	for (const block of body.match(PDF_VIEWER_BLOCK_RE) ?? []) {
		if (!new RegExp(`data-op-pdf-src="\\.\\/${target}"`).test(block)) continue;
		const title = block.match(/data-op-pdf-title="([^"]*)"/)?.[1]?.trim();
		if (title) return title;
	}
	return null;
}

/**
 * Sciezki bezpieczne do usuniecia ze Storage — bez tych, na ktore wskazuje
 * jakikolwiek zachowywany zalacznik.
 */
export function removablePaths(
	stalePaths: readonly string[],
	keptPaths: Iterable<string>,
): string[] {
	const kept = new Set(keptPaths);
	return [...new Set(stalePaths)].filter((path) => path && !kept.has(path));
}

/**
 * Usuwa z importowanej tresci to, co publikacja dokleja sama: linki do plikow
 * i bloki podgladu PDF o adresach wzglednych. Bez tego kolejna publikacja
 * dubluje liste zalacznikow pod wpisem.
 */
export function stripPublishedAttachments(body: string): string {
	return body
		.replace(PDF_VIEWER_BLOCK_RE, (block) =>
			/data-op-pdf-src="\.\//.test(block) ? '' : block,
		)
		.replace(RELATIVE_FILE_LINK_RE, '')
		.replace(/[ \t]+$/gm, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
