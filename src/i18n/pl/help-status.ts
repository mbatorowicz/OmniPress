import { dashboard } from './dashboard';
import { posts } from './posts';

const ed = dashboard.editor;

export const helpStatus = {
	title: 'Statusy wpisu',
	lead: 'Przy każdym artykule na liście widać znacznik. Od niego zależy, czy możesz jeszcze edytować.',
	pairs: [
		{
			term: posts.status.draft,
			desc: 'Wersja robocza. Możesz poprawiać, zapisywać, wysłać albo usunąć. Przy pilnym komunikacie administrator może wysłać szkic do akceptacji albo opublikować go za Ciebie.',
		},
		{
			term: posts.status.pending,
			desc: ed.pendingLocked,
		},
		{
			term: posts.status.scheduled,
			desc: `${ed.scheduledLocked} Wpis jest już zaakceptowany i czeka na wybraną godzinę.`,
		},
		{
			term: posts.status.publishing,
			desc: ed.publishingLocked,
		},
		{
			term: posts.status.published,
			desc: ed.publishedLocked,
		},
		{
			term: posts.status.rejected,
			desc: `${ed.rejectionNote} przeczytaj uwagi na górze edytora, popraw tekst i wyślij ponownie.`,
		},
	],
	afterTitle: 'Po decyzji administratora',
	afterP: 'Otwórz wpis z listy, aby zobaczyć podgląd albo wrócić do edycji.',
	afterPairs: [
		{
			term: posts.status.pending,
			desc: 'Czekaj. Administrator przeczyta artykuł i go przyjmie albo wróci z uwagami. Drobne rzeczy — literówkę, kolejność zdjęć, sposób pokazania PDF-a — może poprawić sam, bez odsyłania wpisu.',
		},
		{
			term: posts.status.rejected,
			desc: 'To nie jest koniec pracy — to prośba o poprawki. Po zmianach znowu klikasz wysłanie.',
		},
		{
			term: posts.status.scheduled,
			desc: 'Nic nie musisz robić. Artykuł pojawi się na stronie o wskazanej godzinie.',
		},
		{
			term: posts.status.published,
			desc: 'Artykuł jest publiczny. Żeby go zmienić, administrator musi otworzyć poprawkę. Do akceptacji nowej wersji na stronie zostaje poprzednia.',
		},
	],
} as const;
