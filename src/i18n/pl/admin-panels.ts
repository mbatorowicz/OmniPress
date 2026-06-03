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
		delete: 'Usuń jednostkę',
	},
	delete: {
		heading: 'Usuń jednostkę organizacyjną',
		lead: 'Trwale usuwa stronę z OmniPress. Działa tylko gdy nie ma żadnych wpisów przypisanych do tej jednostki.',
		confirm: 'Rozumiem — usuń trwale',
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
		has_posts: 'Nie można usunąć — są wpisy przypisane do tej jednostki. Użyj „nieaktywna” zamiast usuwania.',
		delete_failed: 'Usunięcie nie powiodło się.',
		delete_confirm: 'Zaznacz potwierdzenie przed usunięciem.',
	},
	deleted: 'Jednostka usunięta.',
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
		credentialsOptional: 'Credentials opcjonalne przy tworzeniu — możesz dodać przy edycji przed publikacją.',
		noEncryption: 'Brak ENCRYPTION_KEY — credentials nie zostaną zapisane (publikacja zablokowana).',
	},
	types: {
		wordpress: 'WordPress',
		github_astro: 'GitHub → Astro',
	},
	actions: { save: 'Zapisz', create: 'Utwórz', delete: 'Usuń destynację' },
	delete: {
		heading: 'Usuń destynację',
		lead: 'Trwale usuwa kanał publikacji. Niedostępne, gdy istnieją logi publikacji.',
		confirm: 'Rozumiem — usuń trwale',
	},
	errors: {
		save_failed: 'Zapis destynacji nie powiódł się.',
		config_wp_rest_base: 'Podaj URL REST API WordPress.',
		config_repo: 'Podaj repozytorium w formacie owner/repo.',
		has_logs: 'Nie można usunąć — są logi publikacji. Ustaw „nieaktywna” zamiast usuwania.',
		delete_failed: 'Usunięcie nie powiodło się.',
		delete_confirm: 'Zaznacz potwierdzenie przed usunięciem.',
	},
	deleted: 'Destynacja usunięta.',
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
	approved: 'Wpis zaakceptowany — publikacja w tle (start natychmiast).',
	rejected: 'Wpis odrzucony.',
	publishLogs: {
		heading: 'Status publikacji',
		destination: 'Destynacja',
		status: 'Status',
		summary: 'Podsumowanie',
		retries: 'Próby',
		retry: 'Ponów publikację',
		retryQueued: 'Ponowiono — worker w tle.',
		empty: 'Brak logów publikacji.',
	},
	logStatus: {
		pending: 'Oczekuje',
		processing: 'W trakcie',
		success: 'Sukces',
		failed: 'Błąd',
		withdrawn: 'Cofnięto',
	},
	errors: {
		not_pending: 'Wpis nie oczekuje na akceptację.',
		no_destinations: 'Wybierz co najmniej jedną destynację.',
		note_required: 'Podaj uwagi (min. 3 znaki).',
		invalid_destinations: 'Niedozwolona destynacja dla tej strony.',
		retry_failed: 'Nie udało się ponowić (log nie jest w stanie failed).',
	},
} as const;
