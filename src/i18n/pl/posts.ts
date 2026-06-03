import { common } from './common';

export const posts = {
	status: {
		draft: 'Szkic',
		pending: 'Do akceptacji',
		publishing: 'Publikacja w toku',
		published: 'Opublikowany',
		rejected: 'Odrzucony',
	},
	errors: {
		no_site: 'Brak przypisanej strony — poproś administratora o dostęp.',
		create_failed: 'Nie udało się utworzyć artykułu. Spróbuj ponownie.',
		forbidden: 'Nie możesz edytować tego wpisu.',
		save_failed: 'Zapis nie powiódł się.',
		submit_failed: 'Wysłanie do akceptacji nie powiodło się.',
		title_required: 'Podaj tytuł przed wysłaniem do akceptacji.',
		not_found: 'Wpis nie istnieje.',
	},
	upload: {
		invalidMime: 'Dozwolone formaty: JPEG, PNG, WebP, GIF.',
		tooLarge: 'Plik jest za duży (max 10 MB).',
	},
} as const;

export type PostErrorCode = keyof typeof posts.errors;

export function postError(code: string): string {
	if (code in posts.errors) {
		return posts.errors[code as PostErrorCode];
	}
	return common.genericError;
}
