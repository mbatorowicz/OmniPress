/**
 * Czytelna nazwa załącznika (`assets.filename`) — etykieta na stronie,
 * nie nazwa pliku w Storage (`storage_path`).
 */
export const ASSET_FILENAME_MAX = 200;

const CONTROL_RE = /[\u0000-\u001F\u007F]/g;
const MARKDOWN_BREAK_RE = /[[\]()]/g;

export function sanitizeAssetFilename(raw: string): string | null {
	const name = raw
		.replace(CONTROL_RE, '')
		.replace(MARKDOWN_BREAK_RE, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, ASSET_FILENAME_MAX)
		.trim();
	return name || null;
}

export function parseAssetFilenames(form: FormData): Record<string, string> {
	const names: Record<string, string> = {};
	for (const [key, value] of form.entries()) {
		const match = key.match(/^asset_filename_(.+)$/);
		if (!match || typeof value !== 'string') continue;
		const name = sanitizeAssetFilename(value);
		if (name) names[match[1]!] = name;
	}
	return names;
}
