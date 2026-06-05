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
		publishingLocked: 'Trwa publikacja wpisu — edycja zablokowana.',
		emptyContent: '(pusta treść)',
		backToList: '← Wróć do listy',
		fields: {
			category: 'Kategoria',
			categoryHint: 'Lista pobierana z WordPress i repozytorium Astro tej strony.',
			categoryEmpty: 'Brak kategorii — administrator musi naprawić kanały (WP REST / plik kategorii w repo).',
			title: 'Tytuł',
			slug: 'Slug (opcjonalnie)',
			slugPlaceholder: 'np. komunikat-urzedu',
			content: 'Treść (Markdown)',
			contentHint:
				'Nagłówki: ## H2, ### H3. Zdjęcia w treści: pierwsze = zajawka na liście wpisów, kolejne = galeria na stronie artykułu. PDF — wybór link/podgląd poniżej.',
			amendmentHint:
				'Poprawka opublikowanego wpisu — zapisz zmiany i wyślij ponownie do akceptacji. Na stronie zostanie stara wersja do ponownej publikacji.',
		},
		attachments: {
			heading: 'Załączniki',
			empty: 'Brak plików — użyj „Dodaj plik” powyżej.',
			displayLink: 'Link do pobrania',
			displayEmbed: 'Podgląd PDF na stronie',
			inlineImage: 'Wyświetlane w treści',
			coverImage: 'Zdjęcie zajawkowe',
			galleryImage: 'Galeria',
			unusedImage: 'Nie wstawione w treść',
			pdf: '📄',
			image: '🖼',
		},
		actions: {
			save: 'Zapisz szkic',
			submit: 'Wyślij do akceptacji',
			confirmSubmit: 'Wysłać do akceptacji? Po wysłaniu nie będziesz mógł edytować.',
			addImage: 'Dodaj plik (zdjęcie / PDF)',
		},
		uploadFailed: 'Upload nie powiódł się',
		uploadNetworkError: 'Błąd połączenia przy uploadzie.',
	},
} as const;
