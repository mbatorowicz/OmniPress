/** Teksty przeglądarki wpisów: filtry, sortowanie, tabela, stronicowanie. */
import { ui } from './ui';

export const postsBrowse = {
	filters: {
		aria: 'Filtry listy wpisów',
		search: 'Szukaj w tytule',
		searchPlaceholder: 'np. festyn',
		status: 'Status',
		statusAll: 'Wszystkie statusy',
		site: 'Strona',
		siteAll: 'Wszystkie strony',
		author: 'Autor',
		authorAll: 'Wszyscy autorzy',
		sort: 'Sortowanie',
		apply: 'Filtruj',
		clear: 'Wyczyść filtry',
	},
	sortOptions: {
		updated_at_desc: 'Ostatnia zmiana — najnowsze',
		updated_at_asc: 'Ostatnia zmiana — najstarsze',
		created_at_desc: 'Data utworzenia — najnowsze',
		created_at_asc: 'Data utworzenia — najstarsze',
		title_asc: 'Tytuł: A → Z',
		title_desc: 'Tytuł: Z → A',
	},
	sortHint: (label: string) => `Sortuj: ${label}`,
	columns: {
		title: 'Tytuł',
		author: 'Autor',
		category: 'Kategoria',
		site: 'Strona',
		updatedAt: 'Ostatnia zmiana',
		createdAt: 'Utworzono',
		actions: 'Akcje',
	},
	values: {
		noCategory: '—',
		noAuthor: '—',
	},
	actions: {
		open: 'Otwórz',
		preview: 'Podgląd',
		edit: ui.actions.edit,
	},
	pagination: {
		aria: 'Strony listy wpisów',
		prev: '← Poprzednie',
		next: 'Następne →',
		position: (page: number, pages: number) => `Strona ${page} z ${pages}`,
		total: (n: number) => `Wpisów: ${n}`,
	},
	empty: 'Brak wpisów.',
	emptyFiltered: 'Żaden wpis nie pasuje do filtrów — zmień je lub wyczyść.',
} as const;

/** Lista wszystkich wpisów w panelu administratora (`/admin/posts`). */
export const adminAllPosts = {
	title: 'Wpisy',
	heading: 'Wszystkie wpisy',
	lead: 'Wpisy wszystkich redaktorów — także szkice i wpisy do poprawki. Otwórz wpis, aby go podejrzeć lub poprawić.',
	statusAll: 'Wszystkie',
	queueLink: 'Kolejka akceptacji',
} as const;
