/**
 * Główna kategoria + dodatkowe — czysta logika (bez Supabase).
 * Główna = adres wpisu; dodatkowe = archiwa i feedy (np. strona główna).
 */

export function parseExtraCategorySlugs(form: FormData): string[] {
	return form.getAll('extra_category_slug').map((v) => String(v).trim()).filter(Boolean);
}

export function normalizeExtraCategorySlugs(
	extras: readonly string[],
	primarySlug: string,
	allowedSlugs: ReadonlySet<string>,
): string[] {
	const primary = primarySlug.trim();
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of extras) {
		const slug = raw.trim();
		if (!slug || slug === primary || !allowedSlugs.has(slug) || seen.has(slug)) continue;
		seen.add(slug);
		out.push(slug);
	}
	return out;
}

/** Pełna lista slugów do front-matteru i filtrów strony: główna pierwsza. */
export function allPostCategorySlugs(primarySlug: string, extras: readonly string[]): string[] {
	const primary = primarySlug.trim();
	const rest = extras.map((s) => s.trim()).filter((s) => s && s !== primary);
	return primary ? [primary, ...unique(rest)] : unique(rest);
}

export function extraCategoryNames(
	slugs: readonly string[],
	categories: readonly { slug: string; name: string }[],
): string[] {
	return slugs.map((slug) => categories.find((c) => c.slug === slug)?.name ?? slug);
}

function unique(values: readonly string[]): string[] {
	return [...new Set(values)];
}
