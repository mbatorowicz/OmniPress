/** Ile osobnych spraw widać w nazwach i tekście — sygnał, nie decyzja redaktorska. */

const STOPWORDS = new Set([
	'plakat',
	'ulotka',
	'poster',
	'zaproszenie',
	'skan',
	'pismo',
	'zalacznik',
	'informacja',
	'komunikat',
	'proszę',
	'prosze',
	'publikacja',
	'mieszkancow',
	'załącznik',
]);

function stripDiacritics(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.replace(/ł/g, 'l')
		.replace(/Ł/g, 'l');
}

export function filenameStem(name: string): string {
	return name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ');
}

export function materialTokens(filename: string, text: string): Set<string> {
	const raw = stripDiacritics(`${filenameStem(filename)} ${text.slice(0, 160)}`).toLowerCase();
	const words = raw.split(/[^a-z0-9]+/).filter((w) => w.length >= 5 && !STOPWORDS.has(w));
	return new Set(words);
}

function sharesToken(a: Set<string>, b: Set<string>): boolean {
	for (const token of a) if (b.has(token)) return true;
	return false;
}

export function countMessageClusters(
	files: { filename: string; text: string; suggestedDisplay: string }[],
): number {
	const items = files.filter((row) => row.suggestedDisplay !== 'drop');
	const useful = items
		.map((row) => materialTokens(row.filename, row.text))
		.filter((tokens) => tokens.size > 0);
	if (useful.length <= 1) return Math.max(useful.length, items.length > 0 ? 1 : 0);

	const parent = useful.map((_, i) => i);
	const find = (i: number): number => {
		const p = parent[i] ?? i;
		if (p === i) return i;
		const root = find(p);
		parent[i] = root;
		return root;
	};
	const union = (a: number, b: number) => {
		parent[find(a)] = find(b);
	};
	for (let i = 0; i < useful.length; i++) {
		for (let j = i + 1; j < useful.length; j++) {
			if (sharesToken(useful[i]!, useful[j]!)) union(i, j);
		}
	}
	return new Set(useful.map((_, i) => find(i))).size;
}
