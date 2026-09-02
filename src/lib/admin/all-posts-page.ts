/**
 * Dane listy wszystkich wpisów (`/admin/posts`): strona wyników z filtrem,
 * liczniki statusów oraz słowniki do filtrów (strony, autorzy).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { listSites } from '@/lib/admin/sites';
import { listUsers } from '@/lib/admin/users';
import { countPostsByStatus, listPostsPage, type PostStatusCounts, type PostsPage } from '@/lib/posts/browse';
import type { PostsFilter } from '@/lib/posts/browse-model';

export type FilterOption = { id: string; name: string };

export type AllPostsPageData = {
	page: PostsPage;
	counts: PostStatusCounts;
	/** Łączna liczba wpisów bez filtra statusu — etykieta zakładki „Wszystkie”. */
	totalAll: number;
	sites: FilterOption[];
	authors: FilterOption[];
};

export async function loadAllPostsPage(
	supabase: SupabaseClient,
	filter: PostsFilter,
): Promise<AllPostsPageData> {
	const [page, counts, sites, users] = await Promise.all([
		listPostsPage(supabase, filter),
		countPostsByStatus(supabase),
		listSites(supabase),
		listUsers(supabase),
	]);

	return {
		page,
		counts,
		totalAll: Object.values(counts).reduce((sum, n) => sum + n, 0),
		sites: sites.map((site) => ({ id: site.id, name: site.name })),
		authors: users
			.filter((user) => Boolean(user.display_name))
			.map((user) => ({ id: user.id, name: user.display_name as string })),
	};
}
