/**
 * Lista wpisów z filtrem, sortowaniem i stronicowaniem (zapytania Supabase).
 * Reguły filtra i sortowania: `browse-model.ts`.
 *
 * Widoczność pilnuje RLS: administrator widzi wpisy wszystkich redaktorów
 * (także szkice), redaktor tylko własne — dlatego `scope.authorId` jest
 * zawężeniem UI, nie zabezpieczeniem.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	POST_STATUS_FILTERS,
	postsPageCount,
	postsPageRange,
	postsOrderOptions,
	type PostsFilter,
} from './browse-model';
import type { PostStatus } from '@/lib/types';

export type PostListRow = {
	id: string;
	title: string;
	status: PostStatus;
	category_name: string | null;
	category_slug: string | null;
	created_at: string;
	updated_at: string;
	scheduled_publish_at: string | null;
	author_id: string | null;
	sites: { name: string } | null;
	profiles: { display_name: string | null } | null;
};

export type PostsPage = {
	rows: PostListRow[];
	total: number;
	page: number;
	pageCount: number;
};

export type PostsScope = {
	/** Wymuszony autor (lista redaktora) — nadpisuje filtr autora z adresu. */
	authorId?: string;
};

const POST_SELECT =
	'id, title, status, category_name, category_slug, created_at, updated_at, scheduled_publish_at, author_id, sites(name), profiles(display_name)';

export async function listPostsPage(
	supabase: SupabaseClient,
	filter: PostsFilter,
	scope: PostsScope = {},
): Promise<PostsPage> {
	const { from, to } = postsPageRange(filter.page);
	let query = supabase.from('posts').select(POST_SELECT, { count: 'exact' });

	const authorId = scope.authorId ?? filter.authorId;
	if (authorId) query = query.eq('author_id', authorId);
	if (filter.status !== 'all') query = query.eq('status', filter.status);
	if (filter.siteId) query = query.eq('site_id', filter.siteId);
	if (filter.q) query = query.ilike('title', `%${filter.q}%`);

	const { column, options } = postsOrderOptions(filter.sort);
	const { data, count } = await query
		// Drugi klucz sortowania stabilizuje kolejność między stronami przy równych datach.
		.order(column, options)
		.order('id', { ascending: true })
		.range(from, to);

	const total = count ?? 0;
	// Supabase typuje zagnieżdżone `sites(name)` jako tablicę, choć relacja jest 1:1.
	return {
		rows: (data ?? []) as unknown as PostListRow[],
		total,
		page: filter.page,
		pageCount: postsPageCount(total),
	};
}

export type PostStatusCounts = Record<PostStatus, number>;

/** Liczniki do zakładek statusów; `all` liczone osobno przez `total` listy. */
export async function countPostsByStatus(
	supabase: SupabaseClient,
	scope: PostsScope = {},
): Promise<PostStatusCounts> {
	const counts = await Promise.all(
		POST_STATUS_FILTERS.map(async (status) => {
			let query = supabase
				.from('posts')
				.select('id', { count: 'exact', head: true })
				.eq('status', status);
			if (scope.authorId) query = query.eq('author_id', scope.authorId);
			const { count } = await query;
			return [status, count ?? 0] as const;
		}),
	);
	return Object.fromEntries(counts) as PostStatusCounts;
}
