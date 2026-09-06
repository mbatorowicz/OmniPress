import { describe, expect, it } from 'vitest';
import {
	DEFAULT_POSTS_FILTER,
	hasActiveFilter,
	parsePostsFilter,
	postsHref,
	postsPageCount,
	postsPageRange,
	postsQueryString,
	sanitizePostsSearch,
	sortAscending,
	sortKeyOf,
	postsOrderOptions,
	toggleSort,
} from './browse-model';

const SITE = '11111111-2222-3333-4444-555555555555';
const AUTHOR = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function filterFrom(query: string) {
	return parsePostsFilter(new URLSearchParams(query));
}

describe('parsePostsFilter', () => {
	it('bez parametrow zwraca domyslny filtr', () => {
		expect(filterFrom('')).toEqual(DEFAULT_POSTS_FILTER);
	});

	it('czyta dozwolone wartosci', () => {
		expect(filterFrom(`status=draft&site=${SITE}&author=${AUTHOR}&sort=title_asc&page=3`)).toEqual({
			status: 'draft',
			siteId: SITE,
			authorId: AUTHOR,
			q: '',
			sort: 'title_asc',
			page: 3,
		});
	});

	it('odrzuca status poza lista', () => {
		expect(filterFrom('status=archived').status).toBe('all');
		expect(filterFrom('status=published').status).toBe('published');
	});

	it('odrzuca sortowanie poza lista', () => {
		expect(filterFrom('sort=content_md_desc').sort).toBe('scheduled_publish_at_desc');
	});

	it('odrzuca identyfikatory, ktore nie sa UUID', () => {
		expect(filterFrom('site=1 or 1=1&author=abc').siteId).toBe('');
		expect(filterFrom('site=1 or 1=1&author=abc').authorId).toBe('');
	});

	it('normalizuje numer strony', () => {
		expect(filterFrom('page=0').page).toBe(1);
		expect(filterFrom('page=-5').page).toBe(1);
		expect(filterFrom('page=abc').page).toBe(1);
		expect(filterFrom('page=99999999').page).toBe(10_000);
	});
});

describe('sanitizePostsSearch', () => {
	it('usuwa znaki wieloznaczne i separatory', () => {
		expect(sanitizePostsSearch('%_*,()\\')).toBe('');
		expect(sanitizePostsSearch('remont *drogi*')).toBe('remont drogi');
	});

	it('skleja biale znaki i obcina dlugosc', () => {
		expect(sanitizePostsSearch('  festyn   gminny  ')).toBe('festyn gminny');
		expect(sanitizePostsSearch('a'.repeat(200))).toHaveLength(80);
	});

	it('pusta wartosc dla braku parametru', () => {
		expect(sanitizePostsSearch(null)).toBe('');
	});
});

describe('sortowanie', () => {
	it('rozklada wartosc na kolumne i kierunek', () => {
		expect(sortKeyOf('created_at_asc')).toBe('created_at');
		expect(sortKeyOf('title_desc')).toBe('title');
		expect(sortKeyOf('scheduled_publish_at_desc')).toBe('scheduled_publish_at');
		expect(sortKeyOf('updated_at_desc')).toBe('updated_at');
		expect(sortAscending('created_at_asc')).toBe(true);
		expect(sortAscending('created_at_desc')).toBe(false);
	});

	it('klik w te sama kolumne odwraca kierunek', () => {
		expect(toggleSort('scheduled_publish_at_desc', 'scheduled_publish_at')).toBe(
			'scheduled_publish_at_asc',
		);
		expect(toggleSort('scheduled_publish_at_asc', 'scheduled_publish_at')).toBe(
			'scheduled_publish_at_desc',
		);
	});

	it('klik w inna kolumne ustawia jej domyslny kierunek', () => {
		expect(toggleSort('scheduled_publish_at_desc', 'title')).toBe('title_asc');
		expect(toggleSort('title_asc', 'created_at')).toBe('created_at_desc');
	});

	it('data publikacji idzie na koniec listy gdy pole jest puste', () => {
		expect(postsOrderOptions('scheduled_publish_at_desc')).toEqual({
			column: 'scheduled_publish_at',
			options: { ascending: false, nullsFirst: false },
		});
		expect(postsOrderOptions('title_asc')).toEqual({
			column: 'title',
			options: { ascending: true },
		});
	});
});

describe('stronicowanie', () => {
	it('liczy zakres wierszy', () => {
		expect(postsPageRange(1, 25)).toEqual({ from: 0, to: 24 });
		expect(postsPageRange(3, 25)).toEqual({ from: 50, to: 74 });
		expect(postsPageRange(0, 25)).toEqual({ from: 0, to: 24 });
	});

	it('liczy liczbe stron', () => {
		expect(postsPageCount(0, 25)).toBe(1);
		expect(postsPageCount(25, 25)).toBe(1);
		expect(postsPageCount(26, 25)).toBe(2);
	});
});

describe('adresy listy', () => {
	it('pomija wartosci domyslne', () => {
		expect(postsQueryString(DEFAULT_POSTS_FILTER)).toBe('');
	});

	it('zmiana filtra wraca na pierwsza strone', () => {
		const filter = { ...DEFAULT_POSTS_FILTER, page: 4, status: 'draft' as const };
		expect(postsHref('/admin/posts', filter, { status: 'pending' })).toBe(
			'/admin/posts?status=pending',
		);
	});

	it('zmiana strony zachowuje filtr', () => {
		const filter = { ...DEFAULT_POSTS_FILTER, status: 'draft' as const, q: 'festyn' };
		expect(postsHref('/admin/posts', filter, { page: 2 })).toBe(
			'/admin/posts?status=draft&q=festyn&page=2',
		);
	});

	it('bez filtra zwraca czysta sciezke', () => {
		expect(postsHref('/dashboard', DEFAULT_POSTS_FILTER)).toBe('/dashboard');
	});
});

describe('hasActiveFilter', () => {
	it('domyslny filtr jest nieaktywny', () => {
		expect(hasActiveFilter(DEFAULT_POSTS_FILTER)).toBe(false);
		expect(hasActiveFilter({ ...DEFAULT_POSTS_FILTER, page: 3 })).toBe(false);
	});

	it('zaweznie zaznacza filtr jako aktywny', () => {
		expect(hasActiveFilter({ ...DEFAULT_POSTS_FILTER, status: 'draft' })).toBe(true);
		expect(hasActiveFilter({ ...DEFAULT_POSTS_FILTER, q: 'festyn' })).toBe(true);
		expect(hasActiveFilter({ ...DEFAULT_POSTS_FILTER, sort: 'title_asc' })).toBe(true);
	});
});
