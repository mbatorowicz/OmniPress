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
	content: {
		heading: 'Treści i publikacja',
		lead: 'Jako administrator możesz pisać szkice w panelu redaktora, potem zaakceptować je tutaj.',
		openDashboard: 'Panel treści — nowy artykuł',
	},
	pending: {
		heading: (n: number) => `Do akceptacji (${n})`,
		empty: 'Brak wpisów oczekujących.',
	},
	publishing: {
		heading: (n: number) => `Publikacja w toku (${n})`,
		empty: 'Brak wpisów w kolejce.',
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
