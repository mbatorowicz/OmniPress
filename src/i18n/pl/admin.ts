import { common } from './common';

export const admin = {
	title: 'Administracja',
	sites: {
		heading: (n: number) => `Strony (${n})`,
		lead: 'Jednostki organizacyjne — każda ma własne repozytorium GitHub do publikacji.',
		empty: 'Dodaj stronę, np.',
		exampleName: 'UG Miedzna',
		exampleSlug: 'ug-miedzna',
		manage: 'Zarządzaj stronami',
	},
	editors: {
		manage: 'Redaktorzy',
	},
	content: {
		heading: 'Treści i publikacja',
		lead: 'Jako administrator możesz pisać szkice w panelu redaktora, potem zaakceptować je tutaj.',
		openDashboard: 'Panel treści — nowy artykuł',
	},
	pending: {
		heading: (n: number) => `Do akceptacji (${n})`,
		empty: 'Brak wpisów oczekujących.',
	},
	scheduled: {
		heading: (n: number) => `Zaplanowane (${n})`,
		empty: 'Brak zaplanowanych publikacji.',
		lead: 'Zaakceptowane — worker opublikuje automatycznie o wskazanej godzinie.',
	},
	publishing: {
		heading: (n: number) => `Publikacja w toku (${n})`,
		empty: 'Brak wpisów w kolejce.',
	},
	published: {
		heading: (n: number) => `Opublikowane — poprawka (${n})`,
		lead: 'Zaznacz wiele wpisów i wykonaj akcję zbiorczo — na GitHubie powstanie jeden commit (jeden deploy).',
		empty: 'Brak opublikowanych wpisów.',
	},
	importPosts: {
		heading: 'Synchronizacja z GitHub',
		lead:
			'Jednorazowo pobierz wpisy ze strony Astro do OmniPress. Po synchronizacji wpisy zostają w bazie — odświeżenie strony nie wymaga ponownego importu. Ponowny import aktualizuje treść (bez ponownego pobierania niezmienionych załączników).',
		button: 'Importuj opublikowane wpisy',
		siteLabel: 'Strona',
		success: (imported: number, updated: number) =>
			`Synchronizacja zakończona: ${imported} nowych, ${updated} zaktualizowanych.`,
		warnings: (n: number) => `Uwaga: ${n} problemów przy pobieraniu załączników — sprawdź logi.`,
		errors: {
			no_astro_destination: 'Ta strona nie ma aktywnej destynacji GitHub/Astro.',
			invalid_repo: 'Nieprawidłowa konfiguracja repozytorium.',
			no_github_token: 'Brak tokenu GitHub w destynacji.',
			github_tree_failed: 'Nie udało się odczytać drzewa plików z GitHub.',
		} as Record<string, string>,
	},
	postList: {
		colTitle: 'Tytuł',
		colCategory: 'Kategoria',
		colSite: 'Strona',
		colDate: 'Ostatnia zmiana',
		colPublishAt: 'Publikacja',
		colActions: 'Akcje',
		noCategory: '—',
		open: 'Otwórz',
		selectAll: 'Zaznacz wszystkie',
		selected: 'Zaznaczono: {n}',
		bulkDeactivate: 'Dezaktywuj zaznaczone',
		bulkDelete: 'Usuń zaznaczone',
		bulkDeactivateConfirm:
			'Zdjąć {n} wpisów ze strony? W CMS wrócą do szkicu. Pliki znikną z GitHub w jednym commicie.',
		bulkDeleteConfirm:
			'Trwale usunąć {n} wpisów z OmniPress? Tej operacji nie można cofnąć.',
		deactivate: 'Dezaktywuj',
		delete: 'Usuń',
		deactivateConfirm:
			'Zdjąć wpis ze strony publicznej? W CMS wróci do szkicu — można go później ponownie opublikować.',
		deleteConfirm:
			'Trwale usunąć wpis z OmniPress? Tej operacji nie można cofnąć. Jeśli wpis jest na stronie, zostanie też zdjęty.',
		deactivated: 'Wpis zdezaktywowany — usunięty ze strony, w CMS jest szkicem.',
		deleted: 'Wpis usunięty z OmniPress.',
		bulkDeactivated: (n: number) =>
			`${n} wpisów zdezaktywowanych — zdjęto ze strony (jeden commit GitHub).`,
		bulkDeleted: (n: number) => `${n} wpisów usuniętych z OmniPress.`,
		bulkSkipped: (n: number) => `${n} pozycji pominięto (np. nieopublikowane).`,
		noneSelected: 'Nie zaznaczono żadnego wpisu.',
		invalidAction: 'Nieprawidłowa akcja.',
		remoteWarning: 'Nie udało się zdjąć wpisu ze strony (GitHub) — wpisy w CMS nie zostały usunięte.',
		remoteFailed: 'Usuwanie ze strony nie powiodło się — sprawdź token GitHub i spróbuj ponownie.',
	},
	preview: {
		title: 'Podgląd wpisu',
		heading: 'Podgląd wpisu',
		siteLabel: 'Strona:',
		authorLabel: 'Autor:',
		phaseNote: 'Publikacja na platformach — Faza 4 (kolejka).',
		back: '← Administracja',
	},
} as const;
