import { ui } from './ui';

export const admin = {
	title: 'Administracja',
	queueHeading: 'Kolejka wpisów',
	workflowAria: 'Ścieżka publikacji',
	workflow: {
		review: 'Akceptacja',
		publish: 'Publikacja',
		live: 'Na stronie',
	},
	sites: {
		empty: 'Dodaj stronę, np.',
		exampleName: 'UG Miedzna',
	},
	queueNav: {
		pending: 'Do akceptacji',
		scheduled: 'Zaplanowane',
		published: 'Na stronie',
	},
	inProgressBadge: 'Publikacja…',
	pending: {
		heading: (n: number) => `Do akceptacji (${n})`,
		lead: 'Zaznacz wpisy lub otwórz podgląd.',
		empty: 'Brak wpisów oczekujących.',
	},
	scheduled: {
		heading: (n: number) => `Zaplanowane / w publikacji (${n})`,
		empty: 'Brak zaplanowanych publikacji.',
		lead: 'Publikacja o wskazanej godzinie. „Publikacja…” = trwa właśnie teraz.',
	},
	published: {
		heading: (n: number) => `Na stronie (${n})`,
		lead: 'Wpisy na stronie publicznej.',
		empty: 'Brak opublikowanych wpisów.',
	},
	importPosts: {
		heading: 'Synchronizacja z GitHub',
		lead:
			'Pobierz wpisy ze strony Astro do OmniPress. Ponowny import aktualizuje treść; niezmienione załączniki są pomijane (porównanie SHA).',
		button: 'Importuj opublikowane wpisy',
		siteLabel: 'Strona',
		success: (imported: number, updated: number) =>
			`Synchronizacja zakończona: ${imported} nowych, ${updated} zaktualizowanych.`,
		warnings: (n: number) =>
			`Uwaga: ${n} problemów przy pobieraniu załączników — szczegóły poniżej.`,
		warningsDetailHeading: 'Szczegóły problemów z załącznikami:',
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
		open: 'Podgląd',
		approveQuick: 'Akceptuj',
		approveQuickConfirm: 'Zaakceptować ten wpis?',
		selectAll: 'Zaznacz wszystkie',
		selected: 'Zaznaczono: {n}',
		bulkApprove: 'Zaakceptuj zaznaczone',
		bulkReject: 'Odrzuć zaznaczone',
		bulkRejectNote: 'Uwagi dla redaktora (wspólne dla odrzucenia)',
		bulkCancelSchedule: 'Anuluj harmonogram',
		bulkDeactivate: 'Zdejmij ze strony',
		bulkDelete: 'Usuń zaznaczone',
		bulkApproveConfirm: 'Zaakceptować {n} wpisów?',
		bulkRejectConfirm: 'Odrzucić {n} wpisów? Redaktorzy zobaczą te same uwagi.',
		bulkCancelScheduleConfirm:
			'Anulować harmonogram dla {n} wpisów? Wrócą do szkicu (wpisy w trakcie publikacji są pomijane).',
		bulkDeactivateConfirm:
			'Zdjąć {n} wpisów ze strony? W CMS wrócą do szkicu.',
		bulkDeleteConfirm:
			'Trwale usunąć {n} wpisów z OmniPress? Tej operacji nie można cofnąć.',
		deactivate: 'Zdejmij ze strony',
		delete: ui.actions.delete,
		deactivateConfirm:
			'Zdjąć wpis ze strony? W CMS wróci do szkicu.',
		deleteConfirm:
			'Trwale usunąć wpis z OmniPress? Tej operacji nie można cofnąć.',
		deactivated: 'Wpis zdjęty ze strony — w CMS jest szkicem.',
		deleted: 'Wpis usunięty z OmniPress.',
		bulkApproved: (n: number) => `${n} wpisów zaakceptowanych — publikacja w kolejce.`,
		bulkRejected: (n: number) => `${n} wpisów odrzuconych.`,
		bulkCancelled: (n: number) => `${n} zaplanowanych wpisów wróciło do szkicu.`,
		bulkDeactivated: (n: number) => `${n} wpisów zdjętych ze strony.`,
		bulkDeleted: (n: number) => `${n} wpisów usuniętych z OmniPress.`,
		bulkSkipped: (n: number) => `${n} pozycji pominięto (np. inny status).`,
		noneSelected: 'Nie zaznaczono żadnego wpisu.',
		remoteWarning: 'Nie udało się zdjąć wpisu ze strony — wpisy w CMS nie zostały usunięte.',
	},
	preview: {
		title: 'Akceptacja wpisu',
		heading: 'Akceptacja wpisu',
		siteLabel: 'Strona:',
		authorLabel: 'Autor:',
		categoryLabel: 'Kategoria:',
		emptyContent: '(pusta treść)',
		galleryHeading: 'Galeria zdjęć',
		galleryCover: 'Zajawka',
		back: '← Kolejka',
	},
	bulkErrors: {
		none_selected: 'Nie zaznaczono żadnego wpisu.',
		none_pending: 'Żaden z zaznaczonych wpisów nie oczekuje na akceptację.',
		none_scheduled:
			'Żaden z zaznaczonych wpisów nie jest zaplanowany (wpisy w trakcie publikacji są pomijane).',
		none_published: 'Żaden z zaznaczonych wpisów nie jest na stronie.',
		note_required: 'Podaj uwagi dla redaktora (min. 3 znaki) przy odrzuceniu.',
		approve_failed: 'Nie udało się zaakceptować zaznaczonych wpisów — sprawdź kanały publikacji.',
		update_failed: 'Aktualizacja wpisów nie powiodła się.',
		invalid_action: 'Nieprawidłowa akcja.',
		not_found: 'Nie znaleziono wpisów.',
		remote_failed: 'Usuwanie ze strony nie powiodło się — sprawdź token GitHub i spróbuj ponownie.',
	},
} as const;
