import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_SLUG_LEN = 80;

/** Dopina sufiks do slug, zachowując limit długości. */
export function appendSlugSuffix(base: string, suffix: string | number): string {
	const tail = typeof suffix === 'number' ? `-${suffix}` : `-${suffix}`;
	const maxBase = Math.max(1, MAX_SLUG_LEN - tail.length);
	return base.slice(0, maxBase) + tail;
}

async function isSlugAvailable(
	supabase: SupabaseClient,
	siteId: string,
	candidate: string,
	excludePostId?: string,
): Promise<boolean> {
	let query = supabase.from('posts').select('id').eq('site_id', siteId).eq('slug', candidate).limit(1);
	if (excludePostId) query = query.neq('id', excludePostId);
	const { data } = await query.maybeSingle();
	return !data;
}

/** Zwraca slug wolny w ramach site_id (np. foo → foo-2 przy kolizji). */
export async function resolveUniquePostSlug(
	supabase: SupabaseClient,
	siteId: string,
	baseSlug: string,
	excludePostId?: string,
): Promise<string> {
	const slug = baseSlug.trim();
	if (!slug) return slug;

	if (await isSlugAvailable(supabase, siteId, slug, excludePostId)) return slug;

	for (let i = 2; i <= 99; i++) {
		const candidate = appendSlugSuffix(slug, i);
		if (await isSlugAvailable(supabase, siteId, candidate, excludePostId)) return candidate;
	}

	const fallback = excludePostId?.slice(0, 8) ?? 'post';
	return appendSlugSuffix(slug, fallback);
}
