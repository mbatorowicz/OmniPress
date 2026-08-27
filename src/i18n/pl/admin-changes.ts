/** Teksty panelu ostatnich zmian (ogłoszeń w sidebarze strony). */
export const adminRecentChanges = {
	title: 'Ostatnie zmiany na stronie',
	lead: 'Ogłoś odwiedzającym aktualizację treści (np. nowy numer konta). Wpisy trafiają do widgetu w sidebarze.',
	saved: 'Ogłoszenie dodane do rejestru i wysłane do GitHub.',
	noAstroChannel: 'Brak repozytorium GitHub — nie można zapisać ogłoszenia na stronie.',
	currentHeading: 'Aktualny rejestr (z GitHub)',
	currentEmpty: 'Brak wpisów — pojawią się po publikacji aktualności lub ogłoszeniu zmiany.',
	announceHeading: 'Nowe ogłoszenie',
	announceHint: 'Np. „Zaktualizowano numery rachunków bankowych” + link /kontakt',
	fields: {
		title: 'Tytuł (widoczny w widgecie)',
		href: 'Link docelowy (ścieżka)',
		kind: 'Typ',
	},
	kinds: {
		page: 'Strona informacyjna',
		manual: 'Inna zmiana',
		news: 'Aktualność',
		layout: 'Wygląd strony',
	},
	presets: {
		label: 'Szybki wybór linku',
		kontakt: 'Kontakt (/kontakt)',
		home: 'Strona główna (/)',
	},
	actions: {
		announce: 'Dodaj ogłoszenie',
	},
	table: {
		title: 'Tytuł',
		href: 'Link',
		kind: 'Typ',
		date: 'Data',
	},
	errors: {
		title_required: 'Podaj tytuł (min. 3 znaki).',
		invalid_href: 'Link musi zaczynać się od / (np. /kontakt).',
		invalid_kind: 'Nieprawidłowy typ ogłoszenia.',
		no_astro_destination: 'Brak aktywnego kanału Astro.',
		invalid_repo: 'Nieprawidłowa konfiguracja repozytorium.',
		no_github_token: 'Brak tokenu GitHub.',
		sync_failed: 'Zapis do GitHub nie powiódł się.',
		invalid_file: 'Plik rejestru w repo ma nieprawidłowy format.',
	},
} as const;
