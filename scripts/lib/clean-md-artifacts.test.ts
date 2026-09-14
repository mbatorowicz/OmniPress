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
});

describe('humanizePdfTitle', () => {
	it('zostawia już czytelną etykietę', () => {
		expect(humanizePdfTitle('Poradnik bezpieczeństwa')).toBe('Poradnik bezpieczeństwa');
	});

	it('bierze polski tytuł wpisu zamiast ASCII z nazwy pliku', () => {
		expect(humanizePdfTitle('Plan ogolny w pytaniach i odpowiedziach', 'Plan ogólny w pytaniach i odpowiedziach')).toBe(
			'Plan ogólny w pytaniach i odpowiedziach',
		);
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
	});
});
