/** Panel zużycia bazy i plików (tylko administrator). */
export const adminUsage = {
	title: 'Baza i pliki',
	lead: 'Ile miejsca zajmują dane OmniPress: baza (wpisy, ustawienia) oraz pliki w magazynie.',
	error: 'Nie udało się odczytać zużycia. Spróbuj odświeżyć stronę.',
	tiles: {
		database: 'Baza danych',
		storage: 'Pliki',
		total: 'Razem',
		files: 'Liczba plików',
	},
	kinds: {
		heading: 'Pliki według typu',
		empty: 'Brak plików w magazynie.',
		colKind: 'Typ',
		colCount: 'Sztuk',
		colSize: 'Rozmiar',
		image: 'Zdjęcia',
		pdf: 'PDF',
		document: 'Dokumenty (DOCX, XLSX, GPKG)',
		archive: 'Archiwa ZIP',
		other: 'Inne',
	},
	largest: {
		heading: 'Największe pliki',
		empty: 'Brak plików do pokazania.',
		colName: 'Nazwa',
		colKind: 'Typ',
		colSize: 'Rozmiar',
	},
	optimize: {
		heading: 'Optymalizacja plików',
		body: 'Nowe zdjęcia (JPEG, PNG, WebP) zmniejszamy do 1920 px i zapisujemy jako WebP bez danych GPS. GIF oraz PDF/DOCX/XLSX/ZIP/GPKG zostają w oryginale. Limit wgrania: zdjęcie 10 MB, pozostałe 50 MB. Starsze zdjęcia w magazynie zostają, dopóki ktoś ich nie wgra ponownie.',
	},
} as const;
