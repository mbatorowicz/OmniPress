/** SSOT: src/lib/admin/slug.ts — utrzymuj logikę w sync. */
const TRANSLITERATION = {
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

function transliterate(input) {
	let out = '';
	for (const ch of input) {
		out += TRANSLITERATION[ch] ?? ch;
	}
	return out;
}

export function normalizeSlug(input) {
	return transliterate(String(input ?? ''))
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
}
