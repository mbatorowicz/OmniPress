/**
 * Filtry, sortowanie i stronicowanie listy wpisów — czysta logika, bez Supabase.
 * Wspólne dla `/admin/posts` (wszystkie wpisy, także szkice redaktorów)
 * i listy redaktora na `/dashboard`. Zapytanie: `browse.ts`.
 */
import type { PostStatus } from '@/lib/types';

/** Kolejność statusów w filtrze — od szkicu do publikacji, na końcu odrzucone. */
export const POST_STATUS_FILTERS: readonly PostStatus[] = [
	'draft',
	'pending',
	'scheduled',
	'publishing',
	'published',
	'rejected',
];

/** Kolumna sortowania (tylko wartości bezpieczne dla `order()`). */
export type PostsSortKey = 'scheduled_publish_at' | 'updated_at' | 'created_at' | 'title';

/** Sortowanie jako jedna wartość — jeden parametr w URL, jedna opcja w selekcie. */
export type PostsSort =
	| 'scheduled_publish_at_desc'
	| 'scheduled_publish_at_asc'
	| 'updated_at_desc'
	| 'updated_at_asc'
	| 'created_at_desc'
	| 'created_at_asc'
	| 'title_asc'
	| 'title_desc';

export const POSTS_SORTS: readonly PostsSort[] = [
	'scheduled_publish_at_desc',
	'scheduled_publish_at_asc',
	'updated_at_desc',
	'updated_at_asc',
	'created_at_desc',
	'created_at_asc',
	'title_asc',
	'title_desc',
];

export const DEFAULT_POSTS_SORT: PostsSort = 'scheduled_publish_at_desc';

export const POSTS_PAGE_SIZE = 25;

/** `all` = bez filtra statusu. */
export type PostsStatusFilter = PostStatus | 'all';

export type PostsFilter = {
	status: PostsStatusFilter;
	/** Puste = wszystkie strony. */
	siteId: string;
	/** Puste = wszyscy autorzy (filtr tylko dla admina). */
	authorId: string;
	/** Fraza z tytułu, już bez znaków wieloznacznych. */
	q: string;
	sort: PostsSort;
	/** Numer strony od 1. */
	page: number;
};

export const DEFAULT_POSTS_FILTER: PostsFilter = {
	status: 'all',
	siteId: '',
	authorId: '',
	q: '',
	sort: DEFAULT_POSTS_SORT,
	page: 1,
};

const MAX_SEARCH_LENGTH = 80;
const MAX_PAGE = 10_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fraza szukania bez znaków, które PostgREST traktuje jak wieloznaczne
 * (`*`, `%`, `_`) i bez separatorów listy (`,`), żeby wejście użytkownika
 * nie zmieniało semantyki `ilike`.
 */
export function sanitizePostsSearch(raw: string | null): string {
	if (!raw) return '';
	return raw
		.replace(/[%_*,()\\]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, MAX_SEARCH_LENGTH);
}

function parseStatus(raw: string | null): PostsStatusFilter {
	if (raw && (POST_STATUS_FILTERS as readonly string[]).includes(raw)) return raw as PostStatus;
	return 'all';
}

function parseSort(raw: string | null): PostsSort {
	if (raw && (POSTS_SORTS as readonly string[]).includes(raw)) return raw as PostsSort;
	return DEFAULT_POSTS_SORT;
}

function parseUuid(raw: string | null): string {
	return raw && UUID_RE.test(raw) ? raw : '';
}

function parsePage(raw: string | null): number {
	const page = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(page) || page < 1) return 1;
	return Math.min(page, MAX_PAGE);
}

export function parsePostsFilter(params: URLSearchParams): PostsFilter {
	return {
		status: parseStatus(params.get('status')),
		siteId: parseUuid(params.get('site')),
		authorId: parseUuid(params.get('author')),
		q: sanitizePostsSearch(params.get('q')),
		sort: parseSort(params.get('sort')),
		page: parsePage(params.get('page')),
	};
}

export function sortKeyOf(sort: PostsSort): PostsSortKey {
	if (sort.startsWith('scheduled_publish_at')) return 'scheduled_publish_at';
	if (sort.startsWith('created_at')) return 'created_at';
	if (sort.startsWith('title')) return 'title';
	return 'updated_at';
}

export function sortAscending(sort: PostsSort): boolean {
	return sort.endsWith('_asc');
}

/** Argumenty `order()` — wpisy bez daty publikacji na końcu, nie na górze. */
export function postsOrderOptions(sort: PostsSort): {
	column: PostsSortKey;
	options: { ascending: boolean; nullsFirst?: boolean };
} {
	const column = sortKeyOf(sort);
	const ascending = sortAscending(sort);
	if (column === 'scheduled_publish_at') {
		return { column, options: { ascending, nullsFirst: false } };
	}
	return { column, options: { ascending } };
}

/** Klik w nagłówek kolumny: ta sama kolumna odwraca kierunek, inna startuje domyślnie. */
export function toggleSort(current: PostsSort, key: PostsSortKey): PostsSort {
	if (sortKeyOf(current) !== key) return key === 'title' ? 'title_asc' : `${key}_desc`;
	return (sortAscending(current) ? `${key}_desc` : `${key}_asc`) as PostsSort;
}

/** Zakres dla `range()` Supabase (indeksy włączne). */
export function postsPageRange(page: number, pageSize = POSTS_PAGE_SIZE) {
	const from = (Math.max(page, 1) - 1) * pageSize;
	return { from, to: from + pageSize - 1 };
}

export function postsPageCount(total: number, pageSize = POSTS_PAGE_SIZE): number {
	if (total <= 0) return 1;
	return Math.ceil(total / pageSize);
}

/** Czy użytkownik cokolwiek zawęził — decyduje o pokazaniu linku „Wyczyść”. */
export function hasActiveFilter(filter: PostsFilter): boolean {
	return (
		filter.status !== 'all' ||
		filter.siteId !== '' ||
		filter.authorId !== '' ||
		filter.q !== '' ||
		filter.sort !== DEFAULT_POSTS_SORT
	);
}

/** Query string (bez `?`) z pominięciem wartości domyślnych. */
export function postsQueryString(filter: PostsFilter, patch: Partial<PostsFilter> = {}): string {
	const next = { ...filter, ...patch };
	const params = new URLSearchParams();
	if (next.status !== 'all') params.set('status', next.status);
	if (next.siteId) params.set('site', next.siteId);
	if (next.authorId) params.set('author', next.authorId);
	if (next.q) params.set('q', next.q);
	if (next.sort !== DEFAULT_POSTS_SORT) params.set('sort', next.sort);
	if (next.page > 1) params.set('page', String(next.page));
	return params.toString();
}

/** Adres listy z filtrem; zmiana filtra zawsze wraca na pierwszą stronę. */
export function postsHref(
	basePath: string,
	filter: PostsFilter,
	patch: Partial<PostsFilter> = {},
): string {
	const withPage: Partial<PostsFilter> = 'page' in patch ? patch : { ...patch, page: 1 };
	const query = postsQueryString(filter, withPage);
	return query ? `${basePath}?${query}` : basePath;
}
