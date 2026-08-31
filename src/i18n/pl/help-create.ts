import { common } from './common';
import { dashboard } from './dashboard';

const ed = dashboard.editor;

export const helpCreate = {
	title: 'Jak utworzyć nowy artykuł',
	lead: 'Od przycisku nowego artykułu do wysłania. Możesz zapisać szkic i wrócić później.',
	steps: [
		`W panelu kliknij „${dashboard.articles.newPost}”.`,
		`Jeśli masz kilka stron, najpierw wybierz jednostkę z listy „${common.site}”. Przy jednej stronie wybór nie jest potrzebny.`,
		'Otworzy się pusty edytor. Wybierz kategorię i wpisz tytuł — bez tego nie zapiszesz ani nie wyślesz artykułu.',
		'Napisz treść. Zdjęcia i pliki dodaj w sekcjach pod edytorem.',
		`Opcjonalnie ustaw datę i godzinę publikacji oraz adres w polu „${ed.fields.slug}”.`,
		`Kliknij „${ed.actions.save}”, jeśli chcesz dokończyć później. Albo „${ed.actions.submit}”, gdy artykuł jest gotowy.`,
	],
	confirm: `Przy wysyłaniu pojawi się pytanie: „${ed.actions.confirmSubmit}”. Po potwierdzeniu nie zmienisz już tekstu, dopóki administrator nie podejmie decyzji.`,
	empty: `Jeśli lista jest pusta, zobaczysz komunikat: „${dashboard.posts.empty}”`,
} as const;
