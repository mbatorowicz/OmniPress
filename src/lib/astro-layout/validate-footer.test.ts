import { describe, expect, it } from 'vitest';
import { emptySiteAstroLayout } from './types';
import { migrateFlatSlotsToZones } from './zones';
import { validateFooterLinks } from './validate-footer';
import { validateLayoutPublicLinks } from './validate-layout-links';

const known = new Set([
	'/',
	'/kontakt',
	'/gmina/deklaracja-dostepnosci',
	'/gmina/klauzula-rodo',
	'/aktualnosci',
]);

describe('validateFooterLinks', () => {
	it('zgłasza produkcyjne 404 stopki jako dead_link', () => {
		const issues = validateFooterLinks(
			{
				contactCtaHref: '/kontakt',
				legalLinks: [
					{ label: 'Deklaracja dostępności', href: '/deklaracja-dostepnosci' },
					{ label: 'Polityka prywatności', href: '/polityka-prywatnosci' },
				],
			},
			known,
		);
		expect(issues).toEqual([
			expect.objectContaining({
				href: '/deklaracja-dostepnosci',
				reason: 'dead_link',
			}),
			expect.objectContaining({
				href: '/polityka-prywatnosci',
				reason: 'dead_link',
			}),
		]);
	});

	it('akceptuje poprawione ścieżki i CTA /kontakt', () => {
		const issues = validateFooterLinks(
			{
				contactCtaHref: '/kontakt',
				legalLinks: [
					{ label: 'Deklaracja dostępności', href: '/gmina/deklaracja-dostepnosci' },
					{ label: 'Klauzula informacyjna', href: '/gmina/klauzula-rodo' },
				],
			},
			known,
		);
		expect(issues).toHaveLength(0);
	});

	it('zgłasza martwe CTA i brak href w linku prawnym', () => {
		const issues = validateFooterLinks(
			{
				contactCtaHref: '/mapa-dojazdu',
				legalLinks: [{ label: 'Pusty', href: '' }],
			},
			known,
		);
		expect(issues).toEqual([
			expect.objectContaining({ href: '/mapa-dojazdu', reason: 'dead_link' }),
			expect.objectContaining({ href: '', reason: 'missing_href' }),
		]);
	});

	it('nie sprawdza linków zewnętrznych', () => {
		const issues = validateFooterLinks(
			{
				contactCtaHref: 'https://maps.example',
				legalLinks: [{ label: 'BIP', href: 'https://bip.example.pl' }],
			},
			known,
		);
		expect(issues).toHaveLength(0);
	});
});

describe('validateLayoutPublicLinks', () => {
	it('łączy martwy liść menu z martwym linkiem stopki', () => {
		const layout = {
			...emptySiteAstroLayout(),
			navigation: [{ label: 'Brak', href: '/gmina/brak-strony' }],
			zones: migrateFlatSlotsToZones([
				{
					id: 'footer_main',
					label: 'Stopka',
					component: 'footer.main',
					widget: {
						legalLinks: [{ label: 'Deklaracja', href: '/deklaracja-dostepnosci' }],
					},
				},
			]),
		};
		const issues = validateLayoutPublicLinks(layout, known);
		expect(issues.map((issue) => issue.href)).toEqual([
			'/gmina/brak-strony',
			'/deklaracja-dostepnosci',
		]);
	});
});
