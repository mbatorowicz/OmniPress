import { common } from './common';

export const posts = {
	status: {
		draft: 'Szkic',
		pending: 'Do akceptacji',
		scheduled: 'Zaplanowany',
		publishing: 'Publikacja…',
		published: 'Na stronie',
		rejected: 'Do poprawki',
	},
	errors: {
		no_site: 'Brak przypisanej strony — poproś administratora o dostęp.',
		create_failed: 'Nie udało się utworzyć artykułu. Spróbuj ponownie.',
		forbidden: 'Nie możesz edytować tego wpisu.',
		save_failed: 'Zapis nie powiódł się.',
		submit_failed: 'Wysłanie do akceptacji nie powiodło się.',
		title_required: 'Podaj tytuł przed wysłaniem do akceptacji.',
		category_required: 'Wybierz kategorię wpisu (lista z repozytorium Astro).',
		categories_unavailable: 'Nie udało się pobrać kategorii — sprawdź kanały publikacji.',
		schedule_invalid: 'Nieprawidłowa data publikacji.',
		schedule_past: 'Data publikacji musi być w przyszłości.',
		delete_failed: 'Nie udało się usunąć wpisu.',
		not_found: 'Wpis nie istnieje.',
	},
	upload: {
		invalidMime:
			'Dozwolone formaty: JPEG, PNG, WebP, GIF, PDF, DOCX, XLSX, ZIP, GPKG.',
		invalidContent: 'Zawartość pliku nie odpowiada deklarowanemu formatowi.',
		tooLarge: 'Zdjęcie jest za duże (max 10 MB).',
		pdfTooLarge: 'Plik PDF jest za duży (max 50 MB).',
		fileTooLarge: 'Plik jest za duży (max 50 MB).',
	},
	pdfViewer: {
		prev: 'Poprzednia',
		next: 'Następna',
		page: 'Strona',
		of: 'z',
		zoomIn: 'Powiększ',
		zoomOut: 'Pomniejsz',
		download: 'Pobierz PDF',
		loading: 'Ładowanie PDF…',
		error: 'Nie udało się wyświetlić PDF.',
		open: 'Otwórz PDF w nowej karcie',
	},
} as const;

export type PostErrorCode = keyof typeof posts.errors;

export function postError(code: string): string {
	if (code in posts.errors) {
		return posts.errors[code as PostErrorCode];
	}
	return common.genericError;
}
