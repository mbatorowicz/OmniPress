import {
	DOCX_MIME,
	GPKG_MIME,
	IMAGE_MIME,
	PDF_MIME,
	XLSX_MIME,
	ZIP_MIME,
} from '@/lib/posts/upload-mime';

export const USAGE_KINDS = ['image', 'pdf', 'document', 'archive', 'other'] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

export type UsageKindRow = {
	kind: UsageKind;
	bytes: number;
	count: number;
};

export type UsageLargestFile = {
	filename: string;
	kind: UsageKind;
	bytes: number;
};

export type UsageStats = {
	databaseBytes: number;
	storageBytes: number;
	storageCount: number;
	totalBytes: number;
	kinds: UsageKindRow[];
	largest: UsageLargestFile[];
};

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return `0 ${UNITS[0]}`;
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const digits = unit === 0 || value >= 10 ? 0 : 1;
	return `${value.toLocaleString('pl-PL', { maximumFractionDigits: digits })} ${UNITS[unit]}`;
}

export function storageShare(part: number, total: number): string {
	if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0 || part <= 0) {
		return '0%';
	}
	const pct = (part / total) * 100;
	const digits = pct >= 10 ? 0 : 1;
	return `${pct.toLocaleString('pl-PL', { maximumFractionDigits: digits })}%`;
}

export function classifyUsageKind(mime: string, filename = ''): UsageKind {
	const type = mime.trim().toLowerCase();
	const name = filename.trim().toLowerCase();
	if (type.startsWith('image/') || IMAGE_MIME.has(type)) return 'image';
	if (type === PDF_MIME || name.endsWith('.pdf')) return 'pdf';
	if (type === ZIP_MIME || type === 'application/x-zip-compressed' || name.endsWith('.zip')) {
		return 'archive';
	}
	if (
		type === DOCX_MIME ||
		type === XLSX_MIME ||
		type === GPKG_MIME ||
		type === 'application/x-sqlite3' ||
		name.endsWith('.docx') ||
		name.endsWith('.xlsx') ||
		name.endsWith('.gpkg')
	) {
		return 'document';
	}
	return 'other';
}

function emptyKinds(): UsageKindRow[] {
	return USAGE_KINDS.map((kind) => ({ kind, bytes: 0, count: 0 }));
}

function asInt(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
	if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
	return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function parseUsageRpc(raw: unknown): UsageStats | null {
	const data = asRecord(raw);
	if (!data) return null;

	const kinds = emptyKinds();
	const byMime = asRecord(data.by_mime) ?? {};
	for (const [mime, row] of Object.entries(byMime)) {
		const stats = asRecord(row);
		if (!stats) continue;
		const kind = classifyUsageKind(mime);
		const target = kinds.find((item) => item.kind === kind);
		if (!target) continue;
		target.bytes += asInt(stats.bytes);
		target.count += asInt(stats.count);
	}

	const largest: UsageLargestFile[] = [];
	if (Array.isArray(data.largest)) {
		for (const item of data.largest) {
			const row = asRecord(item);
			if (!row) continue;
			const filename = typeof row.filename === 'string' ? row.filename : '';
			if (!filename) continue;
			largest.push({
				filename,
				kind: classifyUsageKind(typeof row.mime === 'string' ? row.mime : '', filename),
				bytes: asInt(row.bytes),
			});
		}
	}

	const databaseBytes = asInt(data.database_bytes);
	const storageBytes = asInt(data.storage_bytes);
	return {
		databaseBytes,
		storageBytes,
		storageCount: asInt(data.storage_count),
		totalBytes: databaseBytes + storageBytes,
		kinds,
		largest,
	};
}
