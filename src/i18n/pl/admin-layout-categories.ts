/** Checklist i remap kategorii — osobno od słownika wyglądu, żeby ten nie rósł. */
export const adminLayoutCategories = {
	categoryChecklistTitle: 'Jak kategoria trafia na stronę',
	categoryChecklistLead:
		'Szkic w panelu nie jest stroną. Kolejność: zapisz → opublikuj layout → przypisz do feedu strony głównej → dodaj do menu.',
	categoryChecklistDraft: 'Szkic zapisany w OmniPress',
	categoryChecklistPublished: 'Layout opublikowany na stronie',
	categoryChecklistHomeFeed: 'Kategoria w feedzie strony głównej',
	categoryChecklistMenu: 'Pozycja w menu',
	categoryChecklistYes: 'Tak',
	categoryChecklistNo: 'Nie',
	categoryAddToNewsFeed: 'Dodaj do feedu Aktualności',
	categoryAddToMenu: 'Dodaj do menu',
	remapConfirm:
		'Zmiana slugu przepisze {n} wpisów w bazie. Opublikowane adresy na stronie nie zmienią się same — wymagają ponownej publikacji. Kontynuować?',
	remapPublishedNote: (count: number) =>
		count === 1
			? 'Zmieniono slug — 1 opublikowany wpis wymaga ponownej publikacji (URL na stronie zostaje stary).'
			: `Zmieniono slug — ${count} opublikowanych wpisów wymaga ponownej publikacji (URL na stronie zostaje stary).`,
	remapPublishedNone: 'Zmieniono slug w bazie — brak opublikowanych wpisów do ponownej publikacji.',
} as const;
