import { dashboard } from './dashboard';
import { posts } from './posts';

const ed = dashboard.editor;

export const helpFaq = {
	title: 'Najczęstsze problemy',
	lead: 'Gdy coś nie działa — najpierw sprawdź status wpisu i czy masz przypisaną stronę.',
	pairs: [
		{
			term: dashboard.articles.noTargetSite,
			desc: posts.errors.no_site,
		},
		{
			term: ed.fields.categoryEmpty,
			desc: 'Administrator musi uzupełnić listę kategorii strony. Bez kategorii nie zapiszesz artykułu.',
		},
		{
			term: 'Nie mogę edytować artykułu',
			desc: `${ed.pendingLocked} ${ed.publishedLocked}`,
		},
		{
			term: ed.uploadFailed,
			desc: 'Sprawdź format i rozmiar pliku (zdjęcie do 10 MB, pozostałe do 50 MB). Jeśli plik jest poprawny, zgłoś problem administratorowi.',
		},
		{
			term: 'Chcę poprawić artykuł już na stronie',
			desc: ed.publishedLocked,
		},
		{
			term: 'Wpis zniknął z edycji po wysłaniu',
			desc: `To normalne — status zmienił się na „${posts.status.pending}”. Wpis jest na liście; otworzysz podgląd, ale bez edycji.`,
		},
	],
} as const;
