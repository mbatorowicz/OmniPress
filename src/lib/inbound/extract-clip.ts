export const ATTACHMENT_TEXT_LIMIT = 20_000;

/** Zbij białe znaki i obetnij do limitu — mniej tokenów do modelu. */
export function clipText(text: string, limit = ATTACHMENT_TEXT_LIMIT): string {
	const trimmed = text.replace(/\s+/g, ' ').trim();
	if (trimmed.length <= limit) return trimmed;
	return trimmed.slice(0, limit);
}
