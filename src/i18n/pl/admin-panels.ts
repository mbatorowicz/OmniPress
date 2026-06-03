/** Teksty paneli admin CRUD (strony, destynacje, redaktorzy, akceptacja). */
export const adminSites = {
	title: 'Strony',
	newSite: '+ Nowa strona',
	edit: 'Edytuj stronę',
	fields: {
		name: 'Nazwa',
		slug: 'Slug',
		active: 'Aktywna',
		inactive: 'nieaktywna',
	},
	actions: {
		save: 'Zapisz',
		create: 'Utwórz',
		destinations: 'Destynacje',
		editors: 'Redaktorzy',
	},
	destinations: {
		title: 'Destynacje strony',
		lead: 'Zaznacz kanały publikacji powiązane z tą stroną.',
		default: 'Domyślna',
		save: 'Zapisz mapowanie',
	},
	errors: {
		invalid_slug: 'Nieprawidłowy slug (min. 2 znaki, a-z, 0-9, myślnik).',
		save_failed: 'Zapis strony nie powiódł się.',
	},
} as const;

export const adminDestinations = {
	title: 'Destynacje',
	newDestination: '+ Nowa destynacja',
	edit: 'Edytuj destynację',
	fields: {
		name: 'Nazwa',
		type: 'Typ',
		active: 'Aktywna',
		wpRestBase: 'URL REST API WordPress',
		wpUsername: 'Login WP',
		wpAppPassword: 'Hasło aplikacji WP',
		repo: 'Repozytorium (owner/repo)',
		branch: 'Branch',
		contentPath: 'Ścieżka contentu',
		githubToken: 'Token GitHub (PAT)',
		credentialsHint: 'Pozostaw puste, aby zachować obecne credentials.',
		noEncryption: 'Brak ENCRYPTION_KEY — credentials nie zostaną zapisane.',
	},
	types: {
		wordpress: 'WordPress',
		github_astro: 'GitHub → Astro',
	},
	actions: { save: 'Zapisz', create: 'Utwórz' },
	errors: {
		save_failed: 'Zapis destynacji nie powiódł się.',
		credentials_required: 'Podaj credentials (wymagany ENCRYPTION_KEY).',
	},
} as const;

export const adminEditors = {
	title: 'Redaktorzy',
	lead: 'Przypisz strony i domyślną stronę redaktora.',
	fields: {
		sites: 'Dostępne strony',
		defaultSite: 'Domyślna strona',
	},
	actions: { save: 'Zapisz przypisanie' },
	errors: { save_failed: 'Zapis przypisania nie powiódł się.' },
} as const;

export const adminReview = {
	approve: 'Zaakceptuj i przygotuj publikację',
	reject: 'Odrzuć',
	rejectionNote: 'Uwagi dla redaktora (wymagane przy odrzuceniu)',
	destinations: 'Destynacje do publikacji',
	approved: 'Wpis zaakceptowany — kolejka publikacji (Faza 4).',
	rejected: 'Wpis odrzucony.',
	phase4Note: 'Publikacja na WP/Astro — dispatcher w Fazie 4.',
	errors: {
		not_pending: 'Wpis nie oczekuje na akceptację.',
		no_destinations: 'Wybierz co najmniej jedną destynację.',
		note_required: 'Podaj uwagi (min. 3 znaki).',
		invalid_destinations: 'Niedozwolona destynacja dla tej strony.',
	},
} as const;
