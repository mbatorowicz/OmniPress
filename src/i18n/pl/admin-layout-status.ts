/** Stan synchronizacji szkicu ze stroną oraz błędy zapisu i publikacji layoutu. */
export const adminLayoutStatus = {
	syncBar: {
		parityTitle: 'Zgodność ze stroną',
		inSyncCombined: 'Panel i strona są zgodne',
		inSyncDetail: 'Formularz pokazuje ten sam układ, który widzą mieszkańcy.',
		draftAheadCombined: 'Zmiany jeszcze nie są na stronie',
		draftAheadDetailNote:
			'To, co jest w panelu, różni się od strony. Po zapisie szkicu opublikuj, żeby zobaczyli je mieszkańcy.',
		liveAheadCombined: 'Strona ma nowszą wersję',
		liveAheadDetail:
			'Układ na stronie różni się od panelu. Wczytaj go, żeby pracować na aktualnej wersji — publikacja nadpisałaby stronę szkicem.',
		legacyContract:
			'Repozytorium strony używa starego formatu (trzy pliki JSON). Najpierw migracja na jeden plik layoutu — publikacja z panelu nic nie zmieni.',
		unknown: 'Nie wiadomo, czy panel zgadza się ze stroną — skonfiguruj GitHub w Ustawieniach.',
		saveBeforePublish: 'Najpierw zapisz szkic w formularzu poniżej, potem publikuj.',
		publishAllLayout: 'Opublikuj na stronie',
		pullFromSite: 'Wczytaj ze strony',
	},
	flash: {
		savedTitle: 'Szkic zapisany',
		savedNote: 'Zapisano w panelu — na stronie bez zmian, dopóki nie opublikujesz.',
		importedTitle: 'Wczytano układ ze strony',
		importedAndSaved: 'Wczytano ze strony — formularz jest zgodny ze stroną.',
		inSyncShort: 'zgodne ze stroną',
		draftAheadShort: 'wymaga publikacji na stronie',
		linkCount: (count: number) =>
			`${count} ${count === 1 ? 'link' : count < 5 ? 'linki' : 'linków'}`,
	},
	draftStatus: {
		inSync: 'Panel i strona są zgodne',
		inSyncCombined: 'Panel i strona są zgodne — formularz pokazuje ten sam układ.',
		draftAhead: 'Szkic ma nieopublikowane zmiany — opublikuj je, żeby pojawiły się u mieszkańców.',
		liveAhead: 'Strona ma nowszą wersję. Szkic zostaje — publikacja nadpisze stronę wersją z panelu.',
		draftMissingHref:
			'Menu bez linków — odśwież stronę, panel wczyta je ze strony (strona gminy jest w porządku).',
		lastPublished: 'Publikacja',
		lastDraft: 'Zapis szkicu',
	},
	errors: {
		invalid_navigation: 'Menu: nieprawidłowy JSON lub struktura.',
		no_categories: 'Dodaj co najmniej jedną kategorię (slug + nazwa).',
		invalid_category_slug:
			'Każda kategoria musi mieć poprawny slug (litery, cyfry i myślniki, min. 2 znaki) oraz nazwę.',
		duplicate_category_slug:
			'Dwie kategorie mają ten sam slug po normalizacji — zmień jeden z nich.',
		no_slots: 'Dodaj co najmniej jeden komponent.',
		save_failed: 'Zapis nie powiódł się.',
		no_astro_destination: 'Brak repozytorium GitHub — skonfiguruj je w Ustawieniach strony.',
		invalid_repo: 'Nieprawidłowa konfiguracja repozytorium.',
		no_github_token: 'Brak tokenu GitHub — dodaj PAT w Ustawieniach.',
		dead_nav_links:
			'Menu lub stopka zawiera nieistniejące linki wewnętrzne — popraw je przed publikacją na stronie.',
		missing_nav_hrefs:
			'Menu w szkicu nie ma linków, które są na stronie. Odśwież zakładkę — panel wczyta je ze strony, gdy nie masz niewysłanych zmian.',
		import_nav_missing:
			'Nie znaleziono pliku menu w repozytorium GitHub — sprawdź ścieżkę navigation_path w Ustawieniach strony.',
		import_nav_empty:
			'Plik menu w GitHub nie zawiera poprawnych linków — import przerwany, szkic nie został zmieniony.',
		navigation_hrefs_lost:
			'Zapis odrzucony — formularz nie zawiera linków menu. Odśwież stronę, żeby wczytać menu ze strony, zamiast zapisywać pusty szkic.',
		sync_failed: 'Publikacja nie powiodła się — szkic zapisany w panelu.',
		invalid_layout:
			'Plik układu na stronie jest nieprawidłowy lub uszkodzony — sprawdź go w repozytorium.',
		layout_context_failed:
			'Nie udało się wczytać edytora układu — odśwież stronę.',
	},
} as const;
