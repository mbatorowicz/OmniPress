/** Ile osobnych spraw widać w nazwach — sygnał, nie decyzja redaktorska. */

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
	'wariant',
	'wersja',
	'format',
	'poziomy',
	'pionowy',
	'instagram',
	'facebook',
]);

const TOPIC_MIN = 8;

export type ClusterFile = { filename: string; text: string; suggestedDisplay: string };

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

function tokensFrom(raw: string, minLength: number): Set<string> {
	const words = stripDiacritics(raw)
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((w) => w.length >= minLength && !STOPWORDS.has(w));
	return new Set(words);
}

export function materialTokens(filename: string, text: string): Set<string> {
	return tokensFrom(`${filenameStem(filename)} ${text.slice(0, 160)}`, 5);
}

export function filenameTopicTokens(filename: string): Set<string> {
	return tokensFrom(filenameStem(filename), TOPIC_MIN);
}

function sharesToken(a: Set<string>, b: Set<string>): boolean {
	for (const token of a) if (b.has(token)) return true;
	return false;
}

function sameCluster(a: ClusterFile, b: ClusterFile): boolean {
	const topicA = filenameTopicTokens(a.filename);
	const topicB = filenameTopicTokens(b.filename);
	if (topicA.size > 0 && topicB.size > 0) return sharesToken(topicA, topicB);
	return sharesToken(materialTokens(a.filename, a.text), materialTokens(b.filename, b.text));
}

export function groupMessageClusters(files: ClusterFile[]): { filenames: string[] }[] {
	const items = files.filter((row) => row.suggestedDisplay !== 'drop');
	const useful = items.filter(
		(row) => filenameTopicTokens(row.filename).size > 0 || materialTokens(row.filename, row.text).size > 0,
	);
	if (useful.length === 0) return [];
	if (useful.length === 1) return [{ filenames: [useful[0]!.filename] }];

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
			if (sameCluster(useful[i]!, useful[j]!)) union(i, j);
		}
	}

	const seen = new Set<number>();
	const groups: { filenames: string[] }[] = [];
	for (let i = 0; i < useful.length; i++) {
		const root = find(i);
		if (seen.has(root)) continue;
		seen.add(root);
		groups.push({
			filenames: useful.filter((_, j) => find(j) === root).map((row) => row.filename),
		});
	}
	return groups;
}

export function countMessageClusters(files: ClusterFile[]): number {
	return groupMessageClusters(files).length;
}
