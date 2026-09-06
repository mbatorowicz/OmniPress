/** Znaki bez dekompozycji NFD — mapowane przed normalize('NFD'). */
const TRANSLITERATION: Record<string, string> = {
	ł: 'l',
	Ł: 'L',
	đ: 'd',
	Đ: 'D',
	ø: 'o',
	Ø: 'O',
	æ: 'ae',
	Æ: 'AE',
	ß: 'ss',
};

function transliterate(input: string): string {
	let out = '';
	for (const ch of input) {
		out += TRANSLITERATION[ch] ?? ch;
	}
	return out;
}

export function normalizeSlug(input: string): string {
	return transliterate(input)
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
}

/** Lustro regexu Astro (`layout-contract.ts` → `CATEGORY_SLUG`). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
	return slug.length >= 2 && SLUG_PATTERN.test(slug);
}
