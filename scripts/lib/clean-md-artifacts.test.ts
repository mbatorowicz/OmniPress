import { describe, expect, it } from 'vitest';
import {
	cleanExcerpt,
	cleanMarkdownArtifacts,
	humanizePdfTitle,
} from './clean-md-artifacts.mjs';

describe('cleanMarkdownArtifacts', () => {
	it('usuwa shortcode galerii WP i skrypt viewera', () => {
		const md =
			'Akapit.\n\nngg\\_shortcode\\_11\\_placeholderSołectwo UGOSZCZ\n\n' +
			'<div class="op-pdf-viewer" data-op-pdf-src="./a.pdf" data-op-pdf-title="8f9d57d2-c515-4e43-b40a-72091f907939.pdf"></div>' +
			'<script type="module" src="/omnipress/pdf-viewer.js"></script>';
		const out = cleanMarkdownArtifacts(md, 'Dokument');
		expect(out).not.toContain('ngg');
		expect(out).not.toContain('<script');
		expect(out).toContain('Sołectwo UGOSZCZ');
		expect(out).toContain('data-op-pdf-title="Dokument"');
	});

	it('nie skleja adresu szkoły', () => {
		const md = 'ul. Kościelna 15  \n07-106 Miedzna  \ntel. (0-25) 791-05-81  \ne-mail: a@b.pl  \nDyrektor – Anna.';
		const out = cleanMarkdownArtifacts(md);
		expect(out).toContain('ul. Kościelna 15  ');
		expect(out).toMatch(/07-106 Miedzna {2}\n/);
		expect(out).toMatch(/tel\. \(0-25\) 791-05-81 {2}\n/);
		expect(out).toContain('Dyrektor – Anna.');
	});

	it('nie skleja osobnych akapitów pogrubionych', () => {
		const md = '**Szanowni Mieszkańcy,**\n\n**Z radością informujemy.**';
		expect(cleanMarkdownArtifacts(md)).toBe(md);
	});

	it('scala twarde łamanie w połowie zdania, także łańcuchowo', () => {
		const md =
			'Usuwanie azbestu z terenu Gminy  \nMiedzna dofinansowano przez fundusz i  \nGospodarki Wodnej.';
		expect(cleanMarkdownArtifacts(md)).toBe(
			'Usuwanie azbestu z terenu Gminy Miedzna dofinansowano przez fundusz i Gospodarki Wodnej.',
		);
	});

	it('nie rusza atrybutów HTML bloku PDF', () => {
		const md =
			'<div class="op-pdf-viewer" data-op-pdf-src="./a.pdf" data-op-pdf-title="Poradnik bezpieczeństwa.pdf" data-op-pdf-labels="{&quot;prev&quot;:&quot;Poprzednia&quot;}"></div>';
		const out = cleanMarkdownArtifacts(md);
		expect(out).toContain('class="op-pdf-viewer"');
		expect(out).toContain('data-op-pdf-src="./a.pdf"');
		expect(out).toContain('data-op-pdf-title="Poradnik bezpieczeństwa"');
		expect(out).toContain('data-op-pdf-labels="{&quot;prev&quot;:&quot;Poprzednia&quot;}"');
	});

	it('zamienia \\- na listę i czytelne etykiety plików', () => {
		const md =
			'Odbierane będą:\n\n\\- komputery\n\\- monitory\n\n' +
			'[📄 LAS\\_Broszura.pdf](./a.pdf)\n\n[📄 aaaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.pdf](./a.pdf)';
		const out = cleanMarkdownArtifacts(md, 'Broszura LAS');
		expect(out).toContain('- komputery');
		expect(out).not.toContain('\\-');
		expect(out).toContain('[📄 LAS Broszura](./a.pdf)');
		expect(out.match(/\[📄 /g)?.length).toBe(1);
	});

	it('usuwa duplikat PDF z sufiksem -2', () => {
		const md =
			'<div class="op-pdf-viewer" data-op-pdf-src="./poradnik.pdf" data-op-pdf-title="Poradnik"></div>\n\n' +
			'<div class="op-pdf-viewer" data-op-pdf-src="./poradnik-2.pdf" data-op-pdf-title="poradnik"></div>';
		const out = cleanMarkdownArtifacts(md);
		expect(out).toContain('./poradnik.pdf');
		expect(out).not.toContain('./poradnik-2.pdf');
	});

	it('scala złamany wiersz tytułu (Fundusz / Ochrony)', () => {
		const md =
			'Zadanie dofinansowano przez Wojewódzki Fundusz\nOchrony Środowiska i Gospodarki Wodnej w Warszawie w formie dotacji, w kwocie 77 295,93 zł.';
		expect(cleanMarkdownArtifacts(md)).toBe(
			'Zadanie dofinansowano przez Wojewódzki Fundusz Ochrony Środowiska i Gospodarki Wodnej w Warszawie w formie dotacji, w kwocie 77 295,93 zł.',
		);
	});

	it('nie wstawia spacji przed zamykającym cudzysłowem', () => {
		expect(cleanMarkdownArtifacts('w ramach „MAZOWSZE 2019” zrealizowała')).toBe(
			'w ramach „MAZOWSZE 2019” zrealizowała',
		);
	});

	it('rozbija banner DOFINANSOWANO na czytelne zdania', () => {
		const md =
			'**DOFINANSOWANO ZE ŚRODKÓW – RZĄDOWY FUNDUSZ ROZWOJU DRÓG „Remont drogi gminnej nr 420508W w sołectwie Rostki”\n' +
			'DOFINANSOWANIE 336 045,95 zł CAŁKOWITA WARTOŚĆ INWESTYCJI 482 525,65 zł** Gmina Miedzna zawiadamia.';
		const out = cleanMarkdownArtifacts(md);
		expect(out).toContain('**Dofinansowano ze środków Rządowego Funduszu Rozwoju Dróg**');
		expect(out).toContain('Dofinansowanie: 336 045,95 zł.');
		expect(out).toContain('Całkowita wartość inwestycji: 482 525,65 zł.');
		expect(out).toContain('Gmina Miedzna zawiadamia');
		expect(out).not.toContain('DOFINANSOWANO ZE ŚRODKÓW');
	});

	it('rozbija też banner bez pogrubienia', () => {
		const md =
			'DOFINANSOWANO ZE ŚRODKÓW RZĄDOWEGO FUNDUSZU ROZWOJU DRÓG „Remont drogi gminnej nr 420509W” DOFINANSOWANIE 630 984,43 zł CAŁKOWITA WARTOŚĆ INWESTYCJI 901 650,66 zł';
		const out = cleanMarkdownArtifacts(md);
		expect(out).toContain('**Dofinansowano ze środków Rządowego Funduszu Rozwoju Dróg**');
		expect(out).toContain('Dofinansowanie: 630 984,43 zł.');
	});

	it('dokleja „własne Gminy” do linii kwoty i poprawia 2019r.', () => {
		const md =
			'Całkowita wartość zadania (brutto) – 20 803,07 zł w tym środki: dotacji z budżetu Województwa – 10 000,00 zł – 48,07 %\n' +
			'własne Gminy – 10 803,07 zł – 51,93 %\n\nOkres realizacji zadania: 15 sierpnia 2019r. – 30 wrzesień 2019 r.';
		const out = cleanMarkdownArtifacts(md);
		expect(out).toContain('48,07 %, własne Gminy');
		expect(out).toContain('2019 r.');
		expect(out).toContain('30 września 2019 r.');
		expect(out).not.toContain('2019r.');
	});

	it('scala urwany akapit i czyści etykietę 📎', () => {
		const md =
			'eksploatować\n\nbędzie można wyłącznie urządzenia.\n\n' +
			'[📎 Zał.\\_Formularz\\_Program\\_współpracy\\_2027.docx](./a.docx)\n\n[📎 aaaa-bbbb-cccc-dddd-eeeeeeeeeeee.docx](./a.docx)';
		const out = cleanMarkdownArtifacts(md, 'Program współpracy');
		expect(out).toContain('eksploatować będzie można');
		expect(out).toContain('[📎 Zał. Formularz Program współpracy 2027](./a.docx)');
		expect(out.match(/\[📎 /g)?.length).toBe(1);
	});
});

describe('humanizePdfTitle', () => {
	it('zostawia już czytelną etykietę', () => {
		expect(humanizePdfTitle('Poradnik bezpieczeństwa')).toBe('Poradnik bezpieczeństwa');
	});

	it('przywraca polskie znaki z ASCII nazwy pliku', () => {
		expect(humanizePdfTitle('Zalacznik nr 1 wniosek o audyt')).toBe('Załącznik nr 1 wniosek o audyt');
		expect(humanizePdfTitle('ulotka reklamowa audyty i p')).toBe('Ulotka reklamowa audyty i przeglądy');
	});
});

describe('cleanExcerpt', () => {
	it('zastępuje nazwę pliku i UUID tytułem wpisu', () => {
		expect(cleanExcerpt('8f9d57d2-c515-4e43-b40a-72091f907939', 'Aktywizacja zawodowa')).toBe(
			'Aktywizacja zawodowa',
		);
		expect(cleanExcerpt('jesień_bez_infekcji_-_ulotka_grypa_2026_2 (1)', 'Jesień bez infekcji. Złota jesień zaczyna się od profilaktyki.')).toBe(
			'Jesień bez infekcji. Złota jesień zaczyna się od profilaktyki.',
		);
	});

	it('rozdziela sklejone słowa i nie podwaja backslashy YAML', () => {
		expect(cleanExcerpt('rolnychna terenie gminy Miedzna. Zadanie dofinansowano', 'Tytuł')).toContain(
			'rolnych na terenie',
		);
		expect(cleanExcerpt('m. in.: \\\\- komputery \\\\- monitory', 'Zbiórka elektrośmieci')).not.toContain('\\');
		expect(
			cleanExcerpt('DOFINANSOWANO ZE ŚRODKÓW – RZĄDOWY FUNDUSZ ROZWOJU DRÓG „Remont drogi”', 'Remont drogi'),
		).toBe('Remont drogi');
	});
});
