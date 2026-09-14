import { PHRASES } from './clean-md-language-phrases.mjs';

const PDF_BLOCK_RE = /<div class="op-pdf-viewer"[\s\S]*?<\/div>/g;

const TYPOS = [
	[/rozporczęciu/gi, 'rozpoczęciu'],
	[/\bchyba ze\b/g, 'chyba że'],
	[/\bWFOŚi GW\b/g, 'WFOŚiGW'],
	[/\bWFOŚ iGW\b/g, 'WFOŚiGW'],
	[/\bWFOŚ i GW\b/g, 'WFOŚiGW'],
	[/\bw\/w\b/gi, 'ww.'],
	[/i\/lub/gi, 'lub'],
	[/przydomowe oczyszczalni ścieków/g, 'przydomowe oczyszczalnie ścieków'],
	[/w cześć /g, 'w części '],
	[/plac malarskich/g, 'prac malarskich'],
	[/pod korona drogi/g, 'pod koroną drogi'],
	[/podbitkę blaszana/g, 'podbitkę blaszaną'],
	[/ograniczona ilość miejsc/g, 'ograniczoną liczbę miejsc'],
	[/droga mailową/g, 'drogą mailową'],
	[/tło\.\./g, 'tło.'],
	[/(\d),00zł/g, '$1,00 zł'],
	[/(\d)\.(\d{2})k\s*Wp/gi, '$1,$2 kWp'],
	[/(\d)\.(\d{2})kWp/gi, '$1,$2 kWp'],
	[/(\d)\.(\d{3}) (\d{3}),(\d{2})/g, '$1 $2 $3,$4'],
	[/\b(\d{5}),(\d{2})\b/g, (_, a, b) => `${a.slice(0, 2)} ${a.slice(2)},${b}`],
	[/ust\.(\d)/g, 'ust. $1'],
	[/poz\.(\d)/g, 'poz. $1'],
	[/poz\.\s*(\d+)\s+tj\./g, 'poz. $1 t.j.'],
	[/03-\s+226/g, '03-226'],
	[/mln\.\s*zł/g, 'mln zł'],
	[/mln zł\.(?=\s)/g, 'mln zł'],
	[/pt\.\s*,,\s*/g, 'pt. „'],
	[/,,\s*/g, '„'],
	[/\bAktywacja zawodowa\b/g, 'Aktywizacja zawodowa'],
	[/Konsultacje społeczne Plan Ogólny/g, 'Konsultacje społeczne planu ogólnego'],
	[/Opis Projektu/g, 'Opis projektu'],
	[/VIII Ogólnopolskiego Konkursu Filmowego/g, 'VIII Ogólnopolski Konkurs Filmowy'],
	[/energii poprawą jakości/g, 'energii – poprawa jakości'],
	[/Ogłoszenie wójta gminy Miedzna/g, 'Ogłoszenie Wójta Gminy Miedzna'],
	[/Modernizacja Sali sportowej/g, 'Modernizacja sali sportowej'],
	[/\bm\.\s*in\./g, 'm.in.'],
	[/(\d)zł\b/g, '$1 zł'],
	[/(\d{1,3}(?:\.\d{3}){1,2}) zł/g, (_, n) => `${n.replace(/\./g, ' ')} zł`],
	[/Lokalnych w ramach którego/g, 'Lokalnych, w ramach którego'],
	[/nieruchomości na których/g, 'nieruchomości, na których'],
	[/działalność gospodarczą w wyniku której/g, 'działalność gospodarczą, w wyniku której'],
	[/odcinku na którym/g, 'odcinku, na którym'],
	[/części tj\./g, 'części, tj.'],
	[/poniedziałek tj\./g, 'poniedziałek, tj.'],
	[/AGD tj\./g, 'AGD, tj.'],
	[/pracy tzn\./g, 'pracy, tzn.'],
	[/godz\.\s+(\d+)\.(\d{2})\s*-\s*(\d+)\.(\d{2})/g, 'godz. $1.$2–$3.$4'],
	[/Uzasadnienie Plan ogóln Y/g, 'Uzasadnienie planu ogólnego'],
	[/Uzasadnienie Plan Ogólny/g, 'Uzasadnienie planu ogólnego'],
	[/Uzasadnienie planu ogólnego gm\. Miedzna etap opinii/g, 'Uzasadnienie planu ogólnego gm. Miedzna – etap opinii'],
];

function unescapeAttr(value) {
	return String(value).replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

function escapeAttr(value) {
	return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const PN_ABBR = new Set(
	'ul nr r gm m tel godz art ust poz tj itd itp tzw tzn dr św pl al os ds ww p in pn'.split(' '),
);

function extractTaskName(rest) {
	let i = 0;
	while (i < rest.length) {
		const c = rest[i];
		if (c === '\n' || c === '”') break;
		if (c === '.') {
			const word = (rest.slice(0, i).match(/([0-9A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)$/) || [])[1] || '';
			const next = rest[i + 1];
			const abbr = PN_ABBR.has(word.toLocaleLowerCase('pl'));
			if (!abbr && (next == null || next === '\n' || /\s/.test(next))) return rest.slice(0, i);
		}
		i += 1;
	}
	return rest.slice(0, i).trimEnd();
}

function wrapPnQuotes(value) {
	return String(value)
		.replace(/pn\.\s*„([^”]*)”\.\s+(Ogrodowa)/g, 'pn. „$1. $2”')
		.replace(/pn\.\s*:?\s*(?!„)([A-ZĄĆĘŁŃÓŚŹŻ][^\n”]*)/g, (full, inner) => {
			const name = extractTaskName(inner).trim();
			if (name.length < 8) return full;
			return `pn. „${name}”${inner.slice(name.length)}`;
		})
		.replace(/pn\.\s*„([a-ząćęłńóśźż])/g, (_, c) => `pn. „${c.toLocaleUpperCase('pl')}`);
}

export function proofreadPlain(value) {
	let t = String(value);
	for (const [re, repl] of TYPOS) t = t.replace(re, repl);
	for (const [from, to] of PHRASES) t = t.split(from).join(to);
	t = wrapPnQuotes(t);
	t = t.replace(/([^ \n]) {2,}(?=[^ \n])/g, '$1 ');
	t = t.replace(/^ +/gm, '');
	return t;
}

export function proofreadTitle(value) {
	return proofreadPlain(value)
		.replace(/\s*;\)\s*$/g, '')
		.replace(/\s+zapraszamy\.?$/i, '')
		.trim();
}

export function proofreadExcerpt(value, title = '') {
	const raw = String(value).replace(/\\"/g, '"');
	const slugish = raw.replace(/[–—]/g, '-');
	if (!/\s/.test(slugish) && (slugish.match(/-/g) || []).length >= 3) {
		return title || proofreadPlain(raw);
	}
	return proofreadTitle(raw);
}

export function proofreadMarkdown(md) {
	const blocks = [];
	let work = String(md).replace(PDF_BLOCK_RE, (block) => {
		const next = block.replace(/data-op-pdf-title="([^"]*)"/, (_, title) => {
			const clean = proofreadPlain(unescapeAttr(title)).replace(/"/g, '');
			return `data-op-pdf-title="${escapeAttr(clean)}"`;
		});
		blocks.push(next);
		return `\n\n\uE000${blocks.length - 1}\uE001\n\n`;
	});
	work = proofreadPlain(work);
	return work.replace(/\uE000(\d+)\uE001/g, (_, i) => blocks[Number(i)] ?? '').replace(/\n{3,}/g, '\n\n').trim();
}
