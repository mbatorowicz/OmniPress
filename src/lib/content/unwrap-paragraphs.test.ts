import { describe, expect, it } from 'vitest';
import { unwrapHardWrappedMarkdown } from './unwrap-paragraphs';

const UCZTA_WRAPPED = `“W dniu 9 sierpnia 2026 r., podczas XIII Uczty Pierogowej na placu

szkolnym w Miedznie przy ul. Kościelnej 15, w godzinach 15:00–18:00

funkcjonowało stoisko Ekodoradcy Gminy Miedzna, przygotowane w ramach

projektu „Mazowsze bez smogu”.

W trakcie trzygodzinnej akcji Ekodoradczyni prowadziła bezpośrednie

rozmowy i indywidualne konsultacje z mieszkańcami.

Udzielała informacji

dotyczących ochrony powietrza, efektywności energetycznej budynków,

odnawialnych źródeł energii, termomodernizacji, wymiany starych źródeł

ciepła, ograniczania kosztów ogrzewania oraz dostępnych programów

dofinansowania.

Akcja miała formę otwartego punktu konsultacyjno-edukacyjnego, dzięki

czemu uczestnicy mogli w dogodnym momencie uzyskać informacje

dostosowane do potrzeb własnego gospodarstwa domowego”.`;

describe('unwrapHardWrappedMarkdown', () => {
	it('scala złamane wiersze wpisu w prawdziwe akapity', () => {
		const out = unwrapHardWrappedMarkdown(UCZTA_WRAPPED);
		const paragraphs = out.split('\n\n');
		expect(paragraphs).toHaveLength(4);
		expect(paragraphs[0]).toContain('placu szkolnym');
		expect(paragraphs[0]).toContain('Mazowsze bez smogu');
		expect(paragraphs[1]).toContain('mieszkańcami.');
		expect(paragraphs[2]).toContain('dofinansowania.');
		expect(paragraphs[3]).toContain('gospodarstwa domowego');
		expect(out).not.toMatch(/placu\n/);
	});

	it('nie skleja krótkich linii adresu', () => {
		const md = 'Urząd Gminy Miedzna\n\nul. Kościelna 15\n\n08-330 Miedzna';
		expect(unwrapHardWrappedMarkdown(md)).toBe(md);
	});

	it('nie rusza list i nagłówków', () => {
		const md = '## Tytuł\n\n- pierwszy punkt\n- drugi punkt\n\nAkapit po liście.';
		expect(unwrapHardWrappedMarkdown(md)).toBe(md);
	});

	it('zostawia twardy łamacz Markdown (dwie spacje)', () => {
		const md = 'Linia pierwsza z wystarczającą długością tekstu, żeby  \nnie skleić twardego łamacza.';
		expect(unwrapHardWrappedMarkdown(md)).toContain('  \n');
	});

	it('jest idempotentny', () => {
		const once = unwrapHardWrappedMarkdown(UCZTA_WRAPPED);
		expect(unwrapHardWrappedMarkdown(once)).toBe(once);
	});
});
