const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Czytelna etykieta z nazwy pliku WP / UUID (tytuł podglądu PDF). */
export function humanizeLabel(raw: string, fallback = 'Dokument PDF'): string {
	let t = raw
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, '&')
		.replace(/\.pdf$/i, '')
		.replace(/!{2,}/g, '')
		.replace(/\s*\(\d+\)\s*$/g, '')
		.trim();
	if (!t || UUID_RE.test(t)) return fallback;

	t = t.replace(/_+/g, ' ');
	t = t.replace(/([a-ząćęłńóśźż])([A-ZĄĆĘŁŃÓŚŹŻ])/g, '$1 $2');
	t = t.replace(/([A-Za-zÀ-žĄĆĘŁŃÓŚŹŻąćęłńóśźż])-(?=[A-Za-zÀ-žĄĆĘŁŃÓŚŹŻąćęłńóśźż])/g, '$1 ');
	t = t.replace(/\s+-\s+/g, ' – ');
	t = t.replace(/^\d{1,2}[a-z]?[.)]\s+/i, '');
	t = t.replace(/^\d{1,2}(?=\s+[a-ząćęłńóśźż])/u, '').trim();
	t = t.replace(/-\d{1,2}$/g, '');
	t = t.replace(/\bgm\.\s*-?\s*/gi, 'gm. ');
	t = t.replace(/zalacznik/gi, (m) => (/^[A-Z]/.test(m) ? 'Załącznik' : 'załącznik'));
	t = t.replace(/\bwzor\b/gi, 'wzór');
	t = t.replace(/bezplatn/gi, 'bezpłatn');
	t = t.replace(/ogoln/gi, 'ogóln');
	t = t.replace(/audyty i p\b/gi, 'audyty i przeglądy');
	t = t.replace(/\s{2,}/g, ' ').trim();
	if (t.length > 24) t = t.replace(/\s+\d{1,2}$/g, '').trim();
	return t || fallback;
}
