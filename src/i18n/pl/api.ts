export const api = {
	posts: {
		missingPostId: 'Brak ID wpisu',
		unauthorized: 'Niezalogowany',
		forbidden: 'Brak uprawnień',
		missingFile: 'Brak pliku',
		uploadFailed:
			'Upload nie powiódł się. Uruchom migrację storage w Supabase (post-assets).',
	},
} as const;
