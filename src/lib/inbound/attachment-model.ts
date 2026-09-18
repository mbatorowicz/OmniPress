import { inbound } from '@/i18n';
import { sanitizeAssetFilename } from '@/lib/posts/asset-filename';
import { extensionForMime } from '@/lib/posts/upload-markdown';
import {
	DOWNLOAD_FILE_MIMES,
	DOCX_MIME,
	GPKG_MIME,
	PDF_MIME,
	resolveUploadMime,
	XLSX_MIME,
	ZIP_MIME,
	type UploadKind,
} from '@/lib/posts/upload-mime';

export const INBOUND_MAX_ATTACHMENTS = 8;

const EXT_MIME: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.pdf': PDF_MIME,
	'.docx': DOCX_MIME,
	'.xlsx': XLSX_MIME,
	'.zip': ZIP_MIME,
	'.gpkg': GPKG_MIME,
};

export type InboundAttachmentMeta = {
	id: string;
	filename: string;
	size: number;
	contentType: string;
	downloadUrl: string;
};

function asText(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function asSize(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Content-Type z maila bywa z parametrami (`image/jpeg; charset=binary`). */
export function inboundDeclaredMime(declaredType: string): string {
	return declaredType.split(';')[0]?.trim().toLowerCase() ?? '';
}

/** Panelowe resolveUploadMime + rozszerzenie przy `octet-stream`. */
export function resolveInboundMime(filename: string, declaredType: string): string | null {
	const declared = inboundDeclaredMime(declaredType);
	const fromPanel = resolveUploadMime(filename, declared);
	if (fromPanel) return fromPanel;
	if (declared && declared !== 'application/octet-stream') return null;
	const lower = filename.toLowerCase();
	for (const [ext, mime] of Object.entries(EXT_MIME)) {
		if (lower.endsWith(ext)) return mime;
	}
	return null;
}

export function kindForUploadMime(mime: string): UploadKind | null {
	if (mime.startsWith('image/')) return 'gallery';
	if (mime === PDF_MIME) return 'pdf';
	if (mime === DOCX_MIME) return 'docx';
	if (DOWNLOAD_FILE_MIMES.has(mime)) return 'file';
	return null;
}

export function inboundAttachmentFilename(filename: string, contentType: string): string {
	const baseName = filename.split(/[/\\]/).pop() ?? filename;
	const cleaned = sanitizeAssetFilename(baseName) ?? '';
	if (/\.[a-z0-9]{2,8}$/i.test(cleaned)) return cleaned;
	const mime = resolveInboundMime(cleaned, contentType) ?? inboundDeclaredMime(contentType);
	const ext = extensionForMime(mime);
	const base = cleaned || inbound.unnamedFile;
	return ext === 'bin' ? base : `${base}.${ext}`;
}

export function parseReceivedAttachments(raw: unknown): InboundAttachmentMeta[] {
	const rows = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
			? ((raw as { data: unknown[] }).data)
			: [];
	const out: InboundAttachmentMeta[] = [];
	for (const row of rows) {
		if (!row || typeof row !== 'object') continue;
		const rec = row as Record<string, unknown>;
		const downloadUrl = asText(rec.download_url).trim();
		if (!downloadUrl.startsWith('https://')) continue;
		out.push({
			id: asText(rec.id),
			filename: asText(rec.filename),
			size: asSize(rec.size),
			contentType: asText(rec.content_type),
			downloadUrl,
		});
	}
	return out;
}

export function splitAttachmentLimit(
	items: InboundAttachmentMeta[],
	limit = INBOUND_MAX_ATTACHMENTS,
): { accepted: InboundAttachmentMeta[]; overflow: InboundAttachmentMeta[] } {
	return { accepted: items.slice(0, limit), overflow: items.slice(limit) };
}
