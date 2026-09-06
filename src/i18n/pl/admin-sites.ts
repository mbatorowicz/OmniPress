/** Teksty list stron i formularza jednostki. */
import { ui } from './ui';

export const adminSites = {
	title: 'Strony',
	edit: 'Edytuj stronę',
	fields: {
		name: 'Nazwa',
		slug: 'Slug',
		active: 'Aktywna',
		inactive: 'nieaktywna',
	},
	actions: {
		save: ui.actions.save,
		create: 'Utwórz',
		delete: 'Usuń stronę',
	},
	delete: {
		heading: 'Usuń stronę',
		lead: 'Trwale usuwa stronę z OmniPress. Działa tylko gdy nie ma żadnych wpisów przypisanych do tej strony.',
		confirm: 'Rozumiem — usuń trwale',
		postsCount: (n: number) => `(${n} wpisów)`,
	},
	errors: {
		invalid_slug: 'Nieprawidłowy slug (min. 2 znaki, a-z, 0-9, myślnik).',
		save_failed: 'Zapis strony nie powiódł się.',
		has_posts: 'Nie można usunąć — są wpisy przypisane do tej strony. Użyj „nieaktywna” zamiast usuwania.',
		delete_failed: 'Usunięcie nie powiodło się.',
		delete_confirm: 'Zaznacz potwierdzenie przed usunięciem.',
	},
	deleted: 'Strona usunięta.',
	addTile: '+ Dodaj stronę',
	empty: 'Brak stron — utwórz pierwszą (np. UG Miedzna).',
	lead: 'Kliknij kafelek, aby otworzyć ustawienia strony — menu, kategorie, komponenty, strony statyczne i ogłoszenia.',
} as const;

export const adminUnit = {
	title: 'Nowa strona',
	settingsTitle: 'Ustawienia strony',
	lead: 'Nazwa, slug i kanał GitHub do publikacji wpisów — w jednym kroku.',
	settingsLead:
		'Nazwa i slug strony oraz kanał publikacji: repozytorium GitHub, tokeny i opcjonalna weryfikacja deployu Vercel.',
	sections: {
		unit: 'Dane strony',
		astro: 'Publikacja na GitHub',
	},
	actions: { create: 'Utwórz stronę', save: 'Zapisz zmiany' },
	errors: {
		name_required: 'Podaj nazwę strony.',
		invalid_slug: 'Nieprawidłowy slug (min. 2 znaki, a-z, 0-9, myślnik).',
		no_channel: 'Skonfiguruj repozytorium GitHub (pola poniżej).',
		config_repo: 'Podaj repozytorium w formacie owner/repo.',
		site_failed: 'Nie udało się utworzyć strony.',
		destination_failed: 'Nie udało się utworzyć destynacji.',
		mapping_failed: 'Nie udało się powiązać destynacji ze stroną.',
		not_found: 'Strona nie istnieje.',
	},
	credentialsNote: 'Token GitHub opcjonalny przy tworzeniu — dodasz go później w Ustawieniach.',
	astroHelp: {
		title: 'Skąd wziąć dane publikacji?',
		repo: 'GitHub → repozytorium strony w formacie owner/nazwa (np. mbatorowicz/gmina-miedzna.pl).',
		branch: 'Branch — zwykle main.',
		contentPath: 'Ścieżka contentu — dla gminy-miedzna.pl: src/content/news',
		contentLayout: 'Układ: folder (slug/index.md) dla gminy-miedzna.pl',
		token:
			'GitHub → Settings → Developer settings → Fine-grained personal access tokens: Resource owner = właściciel repo, Only select repositories = wyłącznie repo strony (np. gmina-miedzna.pl), Contents = Read and write, Metadata = Read, z datą wygaśnięcia.',
		tokenClassicWarning:
			'Uwaga: używasz classic PAT (ghp_…) — preferuj fine-grained token (github_pat_…) z dostępem tylko do jednego repozytorium.',
		tokenRepoAccess: 'Token ma dostęp do repozytorium:',
		tokenRepoDenied: 'Token nie ma dostępu do skonfigurowanego repozytorium:',
		vercel: 'Vercel → Project Settings → General → Project ID (prj_…). Po publikacji OmniPress sprawdza log buildu.',
	},
	layoutLink: 'Wygląd strony',
	postsLink: 'Wpisy',
	settingsLink: 'Ustawienia',
	contextSiteLabel: 'Strona',
	navigationLink: 'Menu',
	categoriesLink: 'Kategorie',
	componentsLink: 'Komponenty',
	pagesLink: 'Strony statyczne',
	changesLink: 'Ostatnie zmiany',
	advancedPathsTitle: 'Zaawansowane — ścieżki plików w repozytorium',
} as const;

export const adminUnitPosts = {
	title: 'Wpisy',
	lead: 'Tu zarządzasz kategoriami wpisów — dodajesz, edytujesz i publikujesz je na stronie. Poniżej kolejka akceptacji i publikacji.',
} as const;
