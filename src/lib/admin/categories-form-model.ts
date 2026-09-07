import { normalizeSlug } from '@/lib/admin/slug';

/** Adres archiwum, jaki zapisze serwer — nie surowy input. */
export function formatCategoryUrlPreview(slug: string): string {
	const normalized = normalizeSlug(slug);
	return normalized ? `/${normalized}/` : '—';
}

export function parseCategoryPostCounts(raw: string | undefined): Record<string, number> {
	if (!raw) return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return {};
		return Object.fromEntries(
			Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
		);
	} catch {
		return {};
	}
}

export function isLastCategoryRow(count: number): boolean {
	return count <= 1;
}

export function categoryRowPostCount(
	counts: Record<string, number>,
	prevSlug: string,
	slug: string,
): number {
	return counts[prevSlug] ?? counts[slug] ?? 0;
}
