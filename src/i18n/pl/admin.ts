import { common } from './common';

export const admin = {
	title: 'Administracja',
	sites: {
		heading: (n: number) => `Strony (${n})`,
		lead: 'Jednostki organizacyjne — redaktorzy publikują w ramach przypisanej strony.',
		empty: 'Dodaj stronę, np.',
		exampleName: 'UG Miedzna',
		exampleSlug: 'ug-miedzna',
		manage: 'Zarządzaj stronami',
	},
	destinations: {
		heading: (n: number) => `Destynacje (${n})`,
		lead: 'WordPress, GitHub/Astro — konfiguracja w panelu.',
		empty: 'Brak destynacji.',
		manage: 'Zarządzaj destynacjami',
	},
	editors: {
		manage: 'Redaktorzy',
	},
	pending: {
		heading: (n: number) => `Do akceptacji (${n})`,
		empty: 'Brak wpisów oczekujących.',
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
