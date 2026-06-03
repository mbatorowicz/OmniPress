import { common } from './common';

export const dashboard = {
	title: 'Panel redaktora',
	articles: {
		heading: 'Artykuły',
		lead: 'Twórz szkice i wysyłaj do publikacji.',
		newPost: '+ Nowy artykuł',
		noTargetSite: 'Brak strony docelowej.',
	},
	sites: {
		heading: 'Twoje strony',
		empty: 'Brak przypisanej strony.',
	},
	posts: {
		heading: 'Twoje wpisy',
		empty: 'Brak wpisów — utwórz pierwszy artykuł.',
	},
	submitted: 'Wpis wysłany do akceptacji administratora.',
	editor: {
		titleFallback: 'Edytor',
		headingEdit: 'Edytor artykułu',
		headingView: 'Podgląd artykułu',
		siteLabel: 'Strona:',
		saved: 'Zapisano szkic.',
		submitted: 'Wysłano do akceptacji.',
		rejectionNote: 'Uwagi:',
		pendingLocked: 'Wpis oczekuje na akceptację administratora — edycja zablokowana.',
		emptyContent: '(pusta treść)',
		backToList: '← Wróć do listy',
		fields: {
			title: 'Tytuł',
			slug: 'Slug (opcjonalnie)',
			slugPlaceholder: 'np. komunikat-urzedu',
			content: 'Treść (Markdown)',
			contentHint: 'Nagłówki: ## H2, ### H3. Zdjęcie wstawia się jako ![opis](url).',
		},
		actions: {
			save: 'Zapisz szkic',
			submit: 'Wyślij do akceptacji',
			confirmSubmit: 'Wysłać do akceptacji? Po wysłaniu nie będziesz mógł edytować.',
			addImage: 'Dodaj zdjęcie',
		},
		uploadFailed: 'Upload nie powiódł się',
		uploadNetworkError: 'Błąd połączenia przy uploadzie.',
	},
} as const;

export { common };
