import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategorySlugRemap } from './remap-model';

export type RemapPostRow = {
	id: string;
	category_slug: string | null;
	category_name: string | null;
	extra_category_slugs: string[] | null;
	status: string;
};

export type RemapPostsResult = {
	updated: number;
	publishedNeedingRepublish: number;
};

function remapLookup(remaps: readonly CategorySlugRemap[]): Map<string, CategorySlugRemap> {
	return new Map(remaps.map((item) => [item.from, item]));
}

export function applyRemapsToPostRow(
	post: RemapPostRow,
	remaps: readonly CategorySlugRemap[],
): RemapPostRow | null {
	const map = remapLookup(remaps);
	if (map.size === 0) return null;

	let category_slug = post.category_slug;
	let category_name = post.category_name;
	let changed = false;

	const primary = category_slug ? map.get(category_slug) : undefined;
	if (primary) {
		category_slug = primary.to;
		category_name = primary.name;
		changed = true;
	}

	const extras = post.extra_category_slugs ?? [];
	const nextExtras = extras.map((slug) => map.get(slug)?.to ?? slug);
	const extrasChanged = nextExtras.some((slug, index) => slug !== extras[index]);
	if (extrasChanged) changed = true;

	if (!changed) return null;
	return {
		...post,
		category_slug,
		category_name,
		extra_category_slugs: extrasChanged ? [...new Set(nextExtras)] : extras,
	};
}

export async function remapSitePostCategories(
	supabase: SupabaseClient,
	siteId: string,
	remaps: readonly CategorySlugRemap[],
): Promise<RemapPostsResult> {
	if (remaps.length === 0) return { updated: 0, publishedNeedingRepublish: 0 };

	const { data, error } = await supabase
		.from('posts')
		.select('id, category_slug, category_name, extra_category_slugs, status')
		.eq('site_id', siteId);
	if (error || !Array.isArray(data)) return { updated: 0, publishedNeedingRepublish: 0 };

	let updated = 0;
	let publishedNeedingRepublish = 0;
	for (const raw of data as RemapPostRow[]) {
		const next = applyRemapsToPostRow(raw, remaps);
		if (!next) continue;
		const { error: updateError } = await supabase
			.from('posts')
			.update({
				category_slug: next.category_slug,
				category_name: next.category_name,
				extra_category_slugs: next.extra_category_slugs,
			})
			.eq('id', next.id);
		if (updateError) continue;
		updated += 1;
		if (raw.status === 'published') publishedNeedingRepublish += 1;
	}

	return { updated, publishedNeedingRepublish };
}
