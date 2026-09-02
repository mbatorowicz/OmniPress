import { describe, expect, it } from 'vitest';
import { pdfEmbedHtml } from '@/lib/pdf-viewer/embed-html';
import {
	assetLabelFromBody,
	imageSortOrder,
	mimeFromFilename,
	pdfDisplayMode,
	removablePaths,
	storageBasename,
	stripPublishedAttachments,
} from './import-asset-model';
import type { ParsedAstroPost } from './astro-post-parse';

const POST_ID = 'fb165ca2-6e53-4585-8430-fd2812d39647';
const BLOB = '90ed6416-af81-4995-8cdd-1f570df1d810.pdf';

function parsed(overrides: Partial<ParsedAstroPost> = {}): ParsedAstroPost {
	return {
		title: 'Wpis',
		date: null,
		author: 'Administrator',
		categorySlug: 'aktualnosci',
		categoryName: 'Aktualnosci',
		draft: false,
		pinned: false,
		excerpt: null,
		coverImage: null,
		galleryImages: [],
		body: '',
		...overrides,
	};
}

describe('storageBasename', () => {
	it('zwraca nazwe pliku ze sciezki w Storage', () => {
		expect(storageBasename(`${POST_ID}/${BLOB}`)).toBe(BLOB);
	});

	it('radzi sobie ze sciezka bez katalogu', () => {
		expect(storageBasename(BLOB)).toBe(BLOB);
	});
});

describe('removablePaths', () => {
	it('nie usuwa sciezki, na ktora wskazuje zachowywany zalacznik', () => {
		const shared = `${POST_ID}/${BLOB}`;
		expect(removablePaths([shared], [shared])).toEqual([]);
	});

	it('usuwa sciezki bez zadnego zachowywanego wskazania', () => {
		expect(removablePaths([`${POST_ID}/stary.pdf`], [`${POST_ID}/${BLOB}`])).toEqual([
			`${POST_ID}/stary.pdf`,
		]);
	});

	it('odrzuca duplikaty i puste sciezki', () => {
		expect(removablePaths(['a', 'a', ''], [])).toEqual(['a']);
	});
});

describe('assetLabelFromBody', () => {
	it('czyta oryginalna nazwe z etykiety linku PDF', () => {
		const body = `[\u{1F4C4} szczepienia_2026.pdf](./${BLOB})`;
		expect(assetLabelFromBody(body, BLOB)).toBe('szczepienia_2026.pdf');
	});

	it('czyta nazwe z etykiety linku do pliku do pobrania', () => {
		const body = `[\u{1F4CE} dane.gpkg](./dane-uuid.gpkg)`;
		expect(assetLabelFromBody(body, 'dane-uuid.gpkg')).toBe('dane.gpkg');
	});

	it('czyta nazwe z tytulu bloku podgladu PDF', () => {
		const body = pdfEmbedHtml(`./${BLOB}`, 'uchwala_5.pdf');
		expect(assetLabelFromBody(body, BLOB)).toBe('uchwala_5.pdf');
	});

	it('zdejmuje ucieczki Markdown z etykiety', () => {
		const body = `[\u{1F4C4} LAS\\_Broszura.pdf](./${BLOB})`;
		expect(assetLabelFromBody(body, BLOB)).toBe('LAS_Broszura.pdf');
	});

	it('zwraca null, gdy tresc nie zawiera nazwy', () => {
		expect(assetLabelFromBody('Tekst bez zalacznikow', BLOB)).toBeNull();
	});

	it('nie myli zalacznikow o podobnej nazwie', () => {
		const body = `[\u{1F4C4} a.pdf](./a.pdf)\n\n[\u{1F4C4} b.pdf](./ab.pdf)`;
		expect(assetLabelFromBody(body, 'ab.pdf')).toBe('b.pdf');
	});
});

describe('stripPublishedAttachments', () => {
	it('usuwa linki do plikow o adresach wzglednych', () => {
		const body = `Tresc wpisu.\n\n[\u{1F4C4} plakat.pdf](./${BLOB})\n`;
		expect(stripPublishedAttachments(body)).toBe('Tresc wpisu.');
	});

	it('usuwa bloki podgladu PDF o adresach wzglednych', () => {
		const body = `Tresc.\n\n${pdfEmbedHtml(`./${BLOB}`, 'plakat.pdf', undefined, true)}`;
		expect(stripPublishedAttachments(body)).toBe('Tresc.');
	});

	it('zostawia linki zewnetrzne i tresc redaktora', () => {
		const body = 'Zobacz [ustawe](https://example.com/a.pdf) oraz **pogrubienie**.';
		expect(stripPublishedAttachments(body)).toBe(body);
	});

	it('zostawia bloki podgladu o adresie absolutnym', () => {
		const body = pdfEmbedHtml('https://example.com/a.pdf', 'a.pdf');
		expect(stripPublishedAttachments(body)).toBe(body);
	});

	it('scala puste linie po usunieciu zalacznikow', () => {
		const body = `Akapit 1.\n\n[\u{1F4C4} a.pdf](./a.pdf)\n\n[\u{1F4C4} b.pdf](./b.pdf)\n\nAkapit 2.`;
		expect(stripPublishedAttachments(body)).toBe('Akapit 1.\n\nAkapit 2.');
	});
});

describe('pdfDisplayMode', () => {
	it('rozpoznaje embed po bloku podgladu', () => {
		expect(pdfDisplayMode(pdfEmbedHtml(`./${BLOB}`, 'a.pdf'), BLOB)).toBe('embed');
	});

	it('domyslnie zwraca link', () => {
		expect(pdfDisplayMode(`[\u{1F4C4} a.pdf](./${BLOB})`, BLOB)).toBe('link');
	});
});

describe('imageSortOrder', () => {
	it('cover jest pierwszy, galeria zachowuje kolejnosc', () => {
		const post = parsed({
			coverImage: './cover.jpg',
			galleryImages: ['./a.jpg', './b.jpg'],
		});
		expect(imageSortOrder(post, 'cover.jpg')).toBe(0);
		expect(imageSortOrder(post, 'a.jpg')).toBe(1);
		expect(imageSortOrder(post, 'b.jpg')).toBe(2);
	});

	it('obraz poza galeria idzie na koniec', () => {
		expect(imageSortOrder(parsed(), 'inny.jpg')).toBe(100);
	});
});

describe('mimeFromFilename', () => {
	it('mapuje rozszerzenia na MIME', () => {
		expect(mimeFromFilename('a.PDF')).toBe('application/pdf');
		expect(mimeFromFilename('a.jpeg')).toBe('image/jpeg');
		expect(mimeFromFilename('a.gpkg')).toBe('application/geopackage+sqlite3');
	});

	it('nieznane rozszerzenie to strumien binarny', () => {
		expect(mimeFromFilename('a.xyz')).toBe('application/octet-stream');
	});
});
