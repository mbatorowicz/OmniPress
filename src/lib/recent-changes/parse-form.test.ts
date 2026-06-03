import { describe, expect, it } from 'vitest';
import { buildLayoutRecentChangeEntry } from './layout-entry';
import { parseAnnounceForm } from './parse-form';

describe('parseAnnounceForm', () => {
	it('akceptuje poprawne ogłoszenie', () => {
		const form = new FormData();
		form.set('change_title', 'Zaktualizowano numery rachunków');
		form.set('change_href', '/kontakt');
		form.set('change_kind', 'page');

		const result = parseAnnounceForm(form);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.entry.href).toBe('/kontakt');
		expect(result.entry.kind).toBe('page');
	});

	it('odrzuca zły link', () => {
		const form = new FormData();
		form.set('change_title', 'Test');
		form.set('change_href', 'kontakt');
		form.set('change_kind', 'manual');

		expect(parseAnnounceForm(form)).toEqual({ ok: false, error: 'invalid_href' });
	});
});

describe('buildLayoutRecentChangeEntry', () => {
	it('ma stałe sourceId do deduplikacji', () => {
		const a = buildLayoutRecentChangeEntry();
		const b = buildLayoutRecentChangeEntry();
		expect(a.sourceId).toBe(b.sourceId);
		expect(a.kind).toBe('layout');
	});
});
