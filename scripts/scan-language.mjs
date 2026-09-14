/**
 * Skan językowy treści (tytuły, zajawki, ciała).
 * Użycie: node scripts/scan-language.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_B = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../gmina-miedzna.pl');
const ROOTS = [path.join(REPO_B, 'src/content/news'), path.join(REPO_B, 'src/content/pages')];

function walk(dir, acc = []) {
	if (!fs.existsSync(dir)) return acc;
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, ent.name);
		if (ent.isDirectory()) walk(p, acc);
		else if (ent.name === 'index.md') acc.push(p);
	}
	return acc;
}

function splitFm(raw) {
	if (!raw.startsWith('---\n')) return { fm: '', body: raw };
	const end = raw.indexOf('\n---', 4);
	if (end < 0) return { fm: '', body: raw };
	return { fm: raw.slice(0, end + 4), body: raw.slice(end + 4) };
}

function readQuoted(fm, key) {
	const m = fm.match(new RegExp(`^${key}:\\s*"(.*)"\\s*$`, 'm'));
	return m ? m[1].replace(/\\"/g, '"') : '';
}

function rel(file) {
	return path.relative(REPO_B, file).replaceAll('\\', '/');
}

function strip(body) {
	return body
		.replace(/<div class="op-pdf-viewer"[\s\S]*?<\/div>/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
		.replace(/\[[^\]]*\]\([^)]+\)/g, ' ')
		.replace(/<[^>]+>/g, ' ');
}

const TYPOS = [
	[/rozporcz/gi, 'rozporcz (rozpocz?)'],
	[/rozporzę/gi, 'rozporzę'],
	[/\bwójd\b/gi, 'wójd'],
	[/\bwólt\b/gi, 'wólt'],
	[/mieszkanc/gi, 'mieszkanc bez ń'],
	[/mieszkanców/gi, 'mieszkanców'],
	[/informujeże/gi, 'informujeże'],
	[/informuje ze\b/gi, 'informuje ze'],
	[/\bw ramach którego\b/gi, 'w ramach którego'],
	[/poniewaz/gi, 'poniewaz'],
	[/jaknajbardziej/gi, 'jaknajbardziej'],
	[/\bw\/w\b/g, 'w/w'],
	[/i\/lub/g, 'i/lub'],
	[/przedsiebior/gi, 'przedsiebior'],
	[/oswiadcz/gi, 'oswiadcz'],
	[/ogoln/gi, 'ogoln'],
	[/spoln/gi, 'spoln'],
	[/spoleczn/gi, 'spoleczn'],
	[/powietrze\b/g, 'powietrze'],
	[/srodowisk/gi, 'srodowisk'],
	[/zrodl/gi, 'zrodl'],
	[/zlecenie/gi, 'zlecenie?'],
	[/\bwg\b/g, 'wg'],
	[/tzn\./g, 'tzn.'],
	[/tzw\./g, 'tzw.'],
	[/m in\./g, 'm in.'],
	[/m\.in(?!\.)/g, 'm.in bez kropki'],
	[/itp(?!\.)/g, 'itp bez kropki'],
	[/itd(?!\.)/g, 'itd bez kropki'],
	[/np(?!\.)/g, 'np bez kropki'],
	[/ul(?!\.)\s+[A-ZĄĆĘŁŃÓŚŹŻ]/g, 'ul bez kropki'],
	[/godz(?!\.)\s/g, 'godz bez kropki'],
	[/tel(?!\.)\s/g, 'tel bez kropki'],
	[/nr\.\s/g, 'nr. z kropką'],
	[/w\/w\./g, 'w/w.'],
	[/pn\.\s+(?!„)[A-ZĄĆĘŁŃÓŚŹŻ]/g, 'pn. bez cudzysłowu'],
	[/wójta gminy miedzna/g, 'wójta gminy (małe)'],
	[/Wójta gminy Miedzna/g, 'Wójta gminy (mieszane)'],
	[/gminy miedzna/g, 'gminy miedzna'],
	[/gminie miedzna/g, 'gminie miedzna'],
	[/Gmina miedzna/g, 'Gmina miedzna'],
	[/  +/g, 'podwójna spacja'],
	[/\s,/g, 'spacja przed przecinkiem'],
	[/\s\./g, 'spacja przed kropką'],
	[/,,/g, 'podwójny przecinek'],
	[/\.\./g, 'podwójna kropka'],
	[/!!/g, 'podwójny wykrzyknik'],
	[/\?\?/g, 'podwójny pytajnik'],
	[/ ;/g, 'spacja przed średnikiem'],
	[/ :/g, 'spacja przed dwukropkiem'],
	[/\bw imieniu\b/gi, 'w imieniu'],
	[/zawiadamia ,/g, 'zawiadamia ,'],
	[/informuje ,/g, 'informuje ,'],
];

const ASCII_WORD = [
	'mieszkancow',
	'mieszkancy',
	'srodowiska',
	'srodowisko',
	'zrodlo',
	'zrodla',
	'spoleczne',
	'spolecznych',
	'ogolny',
	'ogolnego',
	'oswiadczenie',
	'oswiadczenia',
	'przedsiebiorca',
	'przedsiebiorcy',
	'wniosek',
	'wnioskow',
	'bezplatne',
	'bezplatny',
	'bezplatnych',
	'powiatowy',
	'powiatowego',
	'dzialalnosc',
	'dzialalnosci',
	'sciekow',
	'scieki',
	'oczyszczalni',
	'kanalizacji',
	'kanalizacja',
	'rozporzeciu',
	'rozporzecie',
	'rozpoczeciu',
	'zalacznik',
	'zalaczniki',
	'wzor',
	'wzory',
	'swiadczenie',
	'zaswiadczenie',
	'zaswiadczenia',
	'pelnomocnictwo',
	'pelnomocnika',
	'wlasciciel',
	'wlasciciela',
	'wspolwlasciciela',
	'zgloszenie',
	'zgloszenia',
	'usuwanie',
	'usuniecia',
	'podzial',
	'nieruchomosci',
	'nieruchomosc',
	'decyzji',
	'decyzja',
	'warunkow',
	'zabudowy',
	'lokalizacji',
	'publicznego',
	'srodowiskowej',
	'srodowiskowa',
	'notariusza',
	'zameldowaniu',
	'odpisu',
	'aktu',
	'cywilnego',
	'wysokosci',
	'oplaty',
	'gospodarowanie',
	'odpadami',
	'komunalnymi',
	'zrodel',
	'ciepla',
	'spalania',
	'paliw',
	'formularz',
	'budynki',
	'dostepnosci',
	'dostepnosc',
];

const hits = [];
function note(file, kind, detail) {
	hits.push({ file: rel(file), kind, detail: String(detail).replace(/\s+/g, ' ').slice(0, 160) });
}

const titles = [];
for (const root of ROOTS) {
	for (const file of walk(root)) {
		const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
		const { fm, body } = splitFm(raw);
		const title = readQuoted(fm, 'title');
		const excerpt = readQuoted(fm, 'excerpt');
		const text = `${title}\n${excerpt}\n${strip(body)}`;
		titles.push({ file: rel(file), title, excerpt, body: strip(body).trim() });

		if (/rozporcz/i.test(text)) note(file, 'typo-rozporcz', text.match(/rozporcz\w*/i)?.[0]);
		if (/informujeże|informuje ze\b/i.test(text)) note(file, 'typo-ze', 'informuje że');
		if (/pn\.\s+(?!„)[A-ZĄĆĘŁŃÓŚŹŻ]/.test(text)) {
			const m = text.match(/pn\.\s+(?!„)[A-ZĄĆĘŁŃÓŚŹŻ][^.\n]{0,60}/);
			note(file, 'pn-no-quote', m?.[0]);
		}
		if (/\bwójta gminy miedzna\b/.test(text) || /\bgminy miedzna\b/.test(text) || /\bgminie miedzna\b/.test(text)) {
			const m = text.match(/\b(?:wójta |Wójta )?[Gg]min(?:y|ie|a) miedzna\b/);
			note(file, 'gmina-case', m?.[0]);
		}
		if (/wójt gminy Miedzna/.test(title) || /Ogłoszenie wójta/.test(title)) note(file, 'title-wojt-case', title);
		if (/^informacja(?:\s+\d+)?$/i.test(title.trim())) note(file, 'generic-title', title);
		if (body.trim() && title && foldEq(title, strip(body).trim().replace(/\.$/, ''))) {
			note(file, 'title-eq-body', title);
		}
		if (excerpt && title && foldEq(title, excerpt.replace(/\.$/, ''))) {
			/* ok, duplicated excerpt is common */
		} else if (excerpt && excerpt.length > 12 && foldContainsTypo(excerpt)) {
			note(file, 'excerpt-typo', excerpt);
		}
		if (/\s[,.;:]/.test(text.replace(/https?:\/\/\S+/g, ''))) {
			const m = text.match(/\s[,.;:]/);
			if (m) note(file, 'space-before-punct', nearby(text, m.index));
		}
		if (/[a-ząćęłńóśźż]\s{2,}[a-ząćęłńóśźż]/i.test(strip(body))) {
			const m = strip(body).match(/[a-ząćęłńóśźż]\s{2,}[a-ząćęłńóśźż]/i);
			note(file, 'double-space', m?.[0]);
		}
		if (/[a-ząćęłńóśźż]  [A-ZĄĆĘŁŃÓŚŹŻ]/.test(text)) note(file, 'double-space-sent', '  ');
		if (/\b(itp|itd|np|ul|godz|tel)(?!\.)\s+[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]/.test(text)) {
			const m = text.match(/\b(itp|itd|np|ul|godz|tel)(?!\.)\s+\S+/);
			note(file, 'abbr-dot', m?.[0]);
		}
		if (/\bnr\.\s/.test(text)) note(file, 'nr-dot', 'nr.');
		if (/\bw\/w\b/.test(text)) note(file, 'w-w', 'w/w');
		if (/i\/lub/i.test(text)) note(file, 'i-lub', 'i/lub');
		if (/!!|\?\?|\.\.\.(?!\.)/.test(title)) note(file, 'title-punct', title);
		if (/;\)/.test(text)) note(file, 'wink', ';)');
		if (/[A-ZĄĆĘŁŃÓŚŹŻ]{12,}/.test(title) && !/PDF|CEEB|WFOŚ|NFOŚ|ALARM/.test(title)) {
			note(file, 'title-caps', title);
		}
		for (const word of ASCII_WORD) {
			const re = new RegExp(`\\b${word}\\b`, 'i');
			if (re.test(text) && !hasDiacriticVersion(word, text)) {
				const m = text.match(re);
				if (m && needsDiacritic(m[0])) note(file, 'ascii-word', m[0]);
			}
		}
		if (/m in\./.test(text) || /m\.in(?!\.)/.test(text)) note(file, 'min', 'm.in');
		if (/ponieważ|poniewaz/.test(text) && /poniewaz/.test(text)) note(file, 'poniewaz', 'poniewaz');
		if (/\bze\s+[a-ząćęłńóśźż]/.test(text) && /\bze\s+(zadanie|gmina|wójt|mieszkań)/i.test(text)) {
			note(file, 'ze-vs-że', text.match(/\bze\s+\w+/i)?.[0]);
		}
	}
}

function foldEq(a, b) {
	return a.replace(/[„”"]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pl') ===
		b.replace(/[„”"]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pl');
}

function foldContainsTypo(s) {
	return /rozporcz|mieszkanc[^ó]|srodowisk|ogoln[^e]|oswiadcz|przedsiebior|bezplatn/i.test(s);
}

function nearby(text, i) {
	return text.slice(Math.max(0, i - 20), i + 20);
}

function hasDiacriticVersion() {
	return false;
}

function needsDiacritic(word) {
	const map = {
		mieszkancow: 1,
		mieszkancy: 1,
		srodowiska: 1,
		srodowisko: 1,
		zrodlo: 1,
		zrodla: 1,
		spoleczne: 1,
		spolecznych: 1,
		ogolny: 1,
		ogolnego: 1,
		oswiadczenie: 1,
		oswiadczenia: 1,
		przedsiebiorca: 1,
		przedsiebiorcy: 1,
		bezplatne: 1,
		bezplatny: 1,
		bezplatnych: 1,
		dzialalnosc: 1,
		dzialalnosci: 1,
		sciekow: 1,
		zalacznik: 1,
		zalaczniki: 1,
		wzor: 1,
		zaswiadczenie: 1,
		zaswiadczenia: 1,
		pelnomocnictwo: 1,
		wlasciciel: 1,
		wlasciciela: 1,
		wspolwlasciciela: 1,
		zgloszenie: 1,
		zgloszenia: 1,
		usuniecia: 1,
		podzial: 1,
		nieruchomosci: 1,
		nieruchomosc: 1,
		srodowiskowej: 1,
		srodowiskowa: 1,
		wysokosci: 1,
		oplaty: 1,
		zrodel: 1,
		ciepla: 1,
		dostepnosci: 1,
		dostepnosc: 1,
		rozporzeciu: 1,
		rozporzecie: 1,
		rozpoczeciu: 1,
	};
	return map[word.toLocaleLowerCase('pl')];
}

const byKind = {};
for (const h of hits) {
	byKind[h.kind] ??= [];
	byKind[h.kind].push(h);
}

console.log('Plików:', titles.length);
console.log('Trafień:', hits.length);
for (const [kind, list] of Object.entries(byKind).sort((a, b) => b[1].length - a[1].length)) {
	console.log(`\n=== ${kind} (${list.length}) ===`);
	for (const h of list.slice(0, 40)) console.log(`- ${h.file}: ${h.detail}`);
	if (list.length > 40) console.log(`  … +${list.length - 40}`);
}

console.log('\n=== TYTUŁY ===');
for (const t of titles.filter((x) => x.file.includes('/news/'))) {
	console.log(`- ${t.title}`);
}
