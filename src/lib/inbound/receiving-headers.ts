function asText(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

/** Resend: tablica {name,value} albo obiekt. Klucze małe. */
export function parseEmailHeaders(raw: unknown): Record<string, string> {
	const out: Record<string, string> = {};
	if (Array.isArray(raw)) {
		for (const row of raw) {
			if (!row || typeof row !== 'object') continue;
			const rec = row as Record<string, unknown>;
			const name = asText(rec.name || rec.key).trim().toLowerCase();
			const value = asText(rec.value).trim();
			if (name && value) out[name] = value;
		}
		return out;
	}
	if (!raw || typeof raw !== 'object') return out;
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		const name = key.trim().toLowerCase();
		if (name && typeof value === 'string' && value.trim()) out[name] = value.trim();
	}
	return out;
}

export function headerValue(headers: Record<string, string>, name: string): string | null {
	const value = headers[name.toLowerCase()]?.trim();
	return value || null;
}
