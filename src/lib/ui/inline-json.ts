/** JSON do `<script type="application/json">` — bez `</`, żeby nie uciąć tagu. */
export function toInlineJson(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function parseInlineJson<T>(raw: string | null | undefined): T | null {
	if (!raw?.trim()) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}
