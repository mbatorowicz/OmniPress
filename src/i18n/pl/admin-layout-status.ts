/** Stan synchronizacji szkicu ze stroną live oraz błędy zapisu i publikacji layoutu. */
export const adminLayoutStatus = {
	syncBar: {
		parityTitle: 'Zgodność z live',
		inSyncCombined: 'Panel odzwierciedla stronę',
		inSyncDetail:
			'Ustawienia w formularzu są identyczne z plikiem layoutu na GitHub, z którego renderuje Astro.',
		draftAheadCombined: 'Strona jeszcze nie ma Twoich zmian',
		draftAheadDetailNote: 'Zapisz szkic, potem „Opublikuj cały layout”, aby wysłać je na stronę.',
		liveAheadCombined: 'Strona zmieniona poza OmniPress',
		liveAheadDetail:
			'Plik na GitHub różni się od szkicu. Panel sam wczyta stronę, gdy nie masz niewysłanych zmian lokalnych.',
		legacyContract:
			'Repo Astro używa starego formatu (3 pliki JSON). Wymagana migracja na omnipress-layout.json — publikacja nie zaktualizuje strony.',
		layoutFileLabel: (path: string) => `Plik na stronie: ${path}`,
		draftAheadDetail: (_nav: boolean, _categories: boolean) => '',
		unknown: 'Status synchronizacji ze stroną nieznany — skonfiguruj GitHub w Ustawieniach',
		saveBeforePublish: 'Zapisz szkic w formularzu przed publikacją, aby wysłać bieżące zmiany.',
		publishAllLayout: 'Opublikuj cały layout',
	},
	flash: {
		savedTitle: 'Szkic zapisany',
		savedNote: 'Zapisano w OmniPress — strona live bez zmian do publikacji.',
		importedTitle: 'Layout wczytany ze strony',
		importedAndSaved: 'Wczytano ze strony — formularz zsynchronizowany z GitHub.',
		inSyncShort: 'identyczne ze stroną live',
		draftAheadShort: 'wymaga publikacji na stronie',
		linkCount: (count: number) =>
			`${count} ${count === 1 ? 'link' : count < 5 ? 'linki' : 'linków'}`,
	},
	draftStatus: {
		inSync: 'Panel odzwierciedla stronę live',
		inSyncCombined: 'Panel odzwierciedla stronę — ustawienia identyczne z plikiem layoutu na GitHub.',
		draftAhead: 'Szkic ma nieopublikowane zmiany — użyj „Opublikuj cały layout”, aby wysłać je na stronę.',
		liveAhead:
			'Strona live została zmieniona poza OmniPress. Szkic zostaje — publikacja nadpisze stronę Twoją wersją.',
		draftMissingHref:
			'Menu bez linków — wczytaj menu z GitHub przed publikacją (strona live jest nadal poprawna).',
		lastPublished: 'Publikacja',
		lastDraft: 'Zapis szkicu',
	},
	errors: {
		invalid_navigation: 'Menu: nieprawidłowy JSON lub struktura.',
		no_categories: 'Dodaj co najmniej jedną kategorię (slug + nazwa).',
		no_slots: 'Dodaj co najmniej jeden komponent.',
		no_category_feed_slots:
			'Dodaj komponent „Przypięte” lub „Najnowsze”, aby przypisywać kategorie.',
		save_failed: 'Zapis nie powiódł się.',
		no_astro_destination: 'Brak repozytorium GitHub — skonfiguruj je w Ustawieniach strony.',
		invalid_repo: 'Nieprawidłowa konfiguracja repozytorium.',
		no_github_token: 'Brak tokenu GitHub — dodaj PAT w Ustawieniach.',
		dead_nav_links:
			'Menu zawiera nieistniejące linki wewnętrzne — popraw je przed publikacją na stronie.',
		missing_nav_hrefs:
			'Menu w szkicu nie ma linków, które są na stronie. Odśwież zakładkę — panel sam wczyta menu z GitHub, gdy nie masz niewysłanych zmian.',
		import_nav_missing:
			'Nie znaleziono pliku menu w repozytorium GitHub — sprawdź ścieżkę navigation_path w Ustawieniach strony.',
		import_nav_empty:
			'Plik menu w GitHub nie zawiera poprawnych linków — import przerwany, szkic nie został zmieniony.',
		import_save_failed:
			'Menu pobrano z GitHub, ale zapis szkicu nie powiódł się — sprawdź uprawnienia lub spróbuj ponownie.',
		navigation_hrefs_lost:
			'Zapis odrzucony — formularz nie zawiera linków menu. Odśwież stronę, żeby wczytać menu z GitHub, zamiast zapisywać pusty szkic.',
		sync_failed: 'Publikacja do GitHub nie powiodła się — szkic zapisany w OmniPress.',
		invalid_layout:
			'Plik layoutu na GitHub jest nieprawidłowy lub uszkodzony — sprawdź omnipress-layout.json w repozytorium.',
		layout_context_failed:
			'Nie udało się wczytać edytora layoutu — odśwież stronę.',
	},
} as const;
