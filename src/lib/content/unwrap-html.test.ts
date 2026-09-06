import { describe, expect, it } from 'vitest';
import { unwrapHardWrappedHtml } from './unwrap-html';

describe('unwrapHardWrappedHtml', () => {
	it('scala kolejne <p> ze złamanego zdania (wklejka z Worda)', () => {
		const html =
			'<p>“W dniu 9 sierpnia 2026 r., podczas XIII Uczty Pierogowej na placu</p>' +
			'<p>szkolnym w Miedznie przy ul. Kościelnej 15, w godzinach 15:00–18:00</p>' +
			'<p>funkcjonowało stoisko Ekodoradcy Gminy Miedzna.</p>';
		const out = unwrapHardWrappedHtml(html);
		expect(out.match(/<p>/g)?.length).toBe(1);
		expect(out).toContain('placu szkolnym');
		expect(out).toContain('Miedzna.');
	});

	it('zamienia <br> w połowie zdania na spację', () => {
		const html =
			'<p>Akcja miała formę otwartego punktu konsultacyjno-edukacyjnego, dzięki<br>czemu uczestnicy mogli uzyskać informacje.</p>';
		const out = unwrapHardWrappedHtml(html);
		expect(out).not.toContain('<br>');
		expect(out).toContain('dzięki czemu');
	});

	it('nie skleja krótkich akapitów bez kropki', () => {
		const html = '<p>Urząd Gminy Miedzna</p><p>ul. Kościelna 15</p>';
		expect(unwrapHardWrappedHtml(html)).toBe(html);
	});
});
