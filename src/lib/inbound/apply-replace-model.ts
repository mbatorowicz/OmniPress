import type { InboundFileInventory } from './collect-attachment-texts';

export type ApplyReplaceFile = {
	filename: string;
	mime: string;
	bytes: Uint8Array;
};

export function pickReplaceFile(
	inventory: InboundFileInventory[],
	filename?: string | null,
): ApplyReplaceFile | null {
	const withBytes = inventory.filter((row) => row.bytes && row.bytes.byteLength > 0);
	if (filename) {
		const wanted = filename.trim().toLowerCase();
		const hit = withBytes.find((row) => row.filename.toLowerCase() === wanted);
		if (hit?.bytes) return { filename: hit.filename, mime: hit.mime, bytes: hit.bytes };
	}
	const visible = withBytes.filter((row) => row.suggestedDisplay !== 'drop');
	const pool = visible.length === 1 ? visible : withBytes.length === 1 ? withBytes : [];
	const row = pool[0];
	if (!row?.bytes) return null;
	return { filename: row.filename, mime: row.mime, bytes: row.bytes };
}

export function replaceDisplayMode(
	current: string | null | undefined,
	requested: 'embed' | 'link' | null | undefined,
): 'embed' | 'link' {
	if (requested === 'embed' || requested === 'link') return requested;
	return current === 'embed' ? 'embed' : 'link';
}
