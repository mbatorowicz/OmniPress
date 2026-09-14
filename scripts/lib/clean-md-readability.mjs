const MONTHS = {
	styczeń: 'stycznia',
	luty: 'lutego',
	marzec: 'marca',
	kwiecień: 'kwietnia',
	maj: 'maja',
	czerwiec: 'czerwca',
	lipiec: 'lipca',
	sierpień: 'sierpnia',
	wrzesień: 'września',
	październik: 'października',
	listopad: 'listopada',
	grudzień: 'grudnia',
};

const ASCII_PL = [
	[/za[lł]acznik/gi, 'załącznik'],
	[/\bwzor\b/gi, 'wzór'],
	[/wnioskow\b/gi, 'wniosków'],
	[/bezplatn/gi, 'bezpłatn'],
	[/audytow\b/gi, 'audytów'],
	[/wspolwlasciciela/gi, 'współwłaściciela'],
	[/oswiadczenie/gi, 'oświadczenie'],
	[/ogoln/gi, 'ogóln'],
	[/pos\b/gi, 'POŚ'],
	[/gml\b/gi, 'GML'],
	[/kon\.społ/gi, 'konsultacje społeczne'],
	[/audyty i p\b/gi, 'audyty i przeglądy'],
];

const KEEP_ACRONYM =
	/\b(alarm|pdf|led|osp|kgw|ceeb|qmp|asf|bip|gml|nfośigw|wfośigw|rtv|agd|pjm|rodo|las|pos|poś)\b/gi;

export function restorePolishAscii(value) {
	let t = String(value);
	for (const [re, repl] of ASCII_PL) t = t.replace(re, repl);
	t = t.replace(/\bgm\.\s*-?\s*/gi, 'gm. ');
	t = t.replace(/\bdot\b(?=\s+aktu)/gi, 'dot.');
	return t.replace(/\s{2,}/g, ' ').trim();
}

export function softenAllCapsRun(value) {
	const text = String(value);
	const letters = text.replace(/[^A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]/g, '');
	if (letters.length < 8) return text;
	const upper = (text.match(/[A-ZĄĆĘŁŃÓŚŹŻ]/g) || []).length;
	if (upper / letters.length < 0.72) return text;
	const first = text.match(/[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]/);
	let out = text.toLocaleLowerCase('pl');
	if (first) {
		const i = out.toLocaleLowerCase('pl').indexOf(first[0].toLocaleLowerCase('pl'));
		if (i >= 0) out = out.slice(0, i) + out.charAt(i).toLocaleUpperCase('pl') + out.slice(i + 1);
	}
	return out.replace(KEEP_ACRONYM, (m) => m.toLocaleUpperCase('pl'));
}

export function fixOfficialSpelling(value) {
	return String(value)
		.replace(/(\d{4})r\./g, '$1 r.')
		.replace(/(\d{4})r(?=\s|$|[A-ZĄĆĘŁŃÓŚŹŻ])/g, '$1 r.')
		.replace(/(\d)(mb|cm|zł|m²)\b/gi, '$1 $2')
		.replace(/(\d{1,3})\.(\d{3}),(\d{2})/g, '$1 $2,$3')
		.replace(/\b0(\d)(?=\s+(?:stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia))/g, '$1')
		.replace(
			new RegExp(`\\b(\\d{1,2})\\s+(${Object.keys(MONTHS).join('|')})(?=\\s|[.,;]|$)`, 'gi'),
			(_, d, m) => `${d} ${MONTHS[m.toLocaleLowerCase('pl')] ?? m}`,
		)
		.replace(/\bWFOŚ i GW\b/g, 'WFOŚiGW')
		.replace(/\b(gminie|gminy|gmina) miedzna\b/g, '$1 Miedzna')
		.replace(/ r\.oku\b/g, ' roku')
		.replace(/ r\.ok\b/g, ' rok')
		.replace(/(?<![„"])Mazowieckiego Instrumentu Aktywizacji Sołectw MAZOWSZE/g, '„Mazowieckiego Instrumentu Aktywizacji Sołectw MAZOWSZE')
		.replace(/„„/g, '„')
		.replace(/pn\.\s+(?![„"])([A-ZĄĆĘŁŃÓŚŹŻ][^.\n]{8,80})$/gm, 'pn. „$1”')
		.replace(/([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ])-(?=\s+[a-ząćęłńóśźż])/g, '$1 –');
}

function rewriteFundingInner(inner) {
	const text = inner.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
	const money = text.match(
		/DOFINANSOWANIE\s+([\d\s]+(?:,\d{2})?)(?:\s*zł)?\s*CAŁKOWITA WARTOŚĆ INWESTYCJI\s+([\d\s]+(?:,\d{2})?)(?:\s*zł)?/i,
	);
	const quote = text.match(/[„"]([^”"]+)[”"]/);
	let head = text
		.replace(/[„“”"].*$/s, '')
		.replace(/DOFINANSOWANIE\s+[\d\s,]+.*$/i, '')
		.replace(/^DOFINANSOWANO ZE ŚRODKÓW\s*[–-]?\s*/i, '')
		.trim();
	head = softenAllCapsRun(head)
		.replace(/rządow(?:y|ego) fundusz(?:u)? rozwoju dróg/i, 'Rządowego Funduszu Rozwoju Dróg')
		.replace(
			/państwowego funduszu celowego fundusz dróg samorządowych/i,
			'Państwowego Funduszu Celowego Fundusz Dróg Samorządowych',
		);
	const fund = `Dofinansowano ze środków ${head}`.replace(/\s+/g, ' ').trim();
	const lines = [`**${fund}**`];
	if (quote) lines.push('', `„${quote[1]}”`);
	if (money) {
		const a = money[1].replace(/\s+/g, ' ').trim();
		const b = money[2].replace(/\s+/g, ' ').trim();
		lines.push('', `Dofinansowanie: ${a} zł. Całkowita wartość inwestycji: ${b} zł.`);
	}
	return `${lines.join('\n')}\n\n`;
}

export function formatFundingBanner(md) {
	let out = md.replace(/\*\*DOFINANSOWANO[\s\S]*?\*\*/g, (block) => rewriteFundingInner(block.slice(2, -2)));
	out = out.replace(/^DOFINANSOWANO ZE ŚRODKÓW[^\n]+$/gm, (line) => rewriteFundingInner(line));
	return out;
}

function isStructuredLine(s) {
	const t = s.trim();
	if (!t) return false;
	return (
		/^(tel\.|fax|e-mail|NIP|REGON|ul\.|Data [a-ząćęłńóśźż]|Do budynku|W budynku|Toalety|Dyrektor|\*\*|#{1,6} )/i.test(
			t,
		) || /^\d{2}-\d{3}\b/.test(t)
	);
}

export function softenHardBreaks(md) {
	return md.replace(/ {2}\n/g, (match, offset, source) => {
		const next = source.slice(offset + 3).split('\n')[0]?.trim() ?? '';
		const prev = (source.slice(0, offset).split('\n').at(-1) ?? '').replace(/ {2}$/, '').trimEnd();
		if (!next) return '\n';
		if (isStructuredLine(prev) || isStructuredLine(next)) return '  \n';
		if (/\*\*/.test(prev) && next.startsWith('**')) return '\n\n';
		if (/^Wójt Gminy/.test(prev) && /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(next)) return '\n';
		if (/^[-–*#>]|\d+\.\s/.test(next) || next.startsWith('<') || next.startsWith('\\') || next.startsWith('\uE000'))
			return '\n';
		return ' ';
	});
}

export function joinFundingLines(md) {
	return md.replace(
		/([%zł])\n(własne |środki z Funduszu)/g,
		'$1, $2',
	);
}

export function joinOrphanLowercase(md) {
	return md.replace(/([a-ząćęłńóśźż])\n\n([a-ząćęłńóśźż])/g, '$1 $2');
}

export function preserveAddressBreaks(md) {
	const lines = md.split('\n');
	for (let i = 0; i < lines.length - 1; i += 1) {
		const cur = lines[i].replace(/ +$/, '');
		const next = lines[i + 1];
		if (!next.trim()) continue;
		if (isStructuredLine(cur) && isStructuredLine(next)) lines[i] = `${cur}  `;
	}
	return lines.join('\n');
}

export function spaceMarkdownHeadings(md) {
	return md
		.replace(/(^|\n)(\*\*[^*\n]+\*\*)\n(?!\n)/g, '$1$2\n\n')
		.replace(/([^\n])\n(\*\*[^*\n]+\*\*)(\n)/g, '$1\n\n$2$3');
}

export function capitalizeLabel(value) {
	const t = String(value).trim();
	if (!t) return t;
	return t.charAt(0).toLocaleUpperCase('pl') + t.slice(1);
}

export function deriveTitleFromBody(title, body) {
	if (!/^informacja\.?$/i.test(title.trim())) return title;
	const quoted = body.match(/pn\.\s*„([^”]+)”/);
	if (quoted) return quoted[1].replace(/\.$/, '');
	const first = body
		.replace(/<[^>]+>/g, '')
		.trim()
		.split('\n')
		.find((l) => l.trim())
		?.trim()
		.replace(/^Utylizację /, 'Utylizacja ')
		.replace(/\.$/, '');
	if (!first || first.length <= 24) return title;
	const cut = first.split(/\s+[–—]\s+/)[0]?.trim();
	if (cut && cut.length >= 24 && cut.length <= 120) return cut;
	return first.length > 120 ? `${first.slice(0, 117).replace(/\s+\S*$/, '')}` : first;
}
