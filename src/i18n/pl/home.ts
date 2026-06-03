export const home = {
	tagline: 'Headless CMS do publikacji na WordPress i Astro.',
	setup: {
		heading: 'Konfiguracja wymagana',
		body:
			'Utwórz plik .env na podstawie .env.example, uruchom migrację SQL w Supabase, potem npm run dev.',
	},
	goToLogin: 'Przejdź do logowania →',
} as const;
