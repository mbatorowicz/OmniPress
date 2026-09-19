import { describe, expect, it } from 'vitest';
import { correspondentEmail, extractForwardHops } from './correspondent';

const GMAIL = `Proszę opublikować.

---------- Forwarded message ---------
From: Sekretariat <sekretariat@sp-miedzna.pl>
Date: Fri, 18 Sep 2026
Subject: Plakaty
To: ja@cncsolutions.dev

---------- Forwarded message ---------
From: Powiat <wet@powiat.siedlce.pl>
Subject: Szczepienia

Proszę poinformować mieszkańców.
`;

const OUTLOOK = `Od: Urząd Gminy <ug@gminamiedzna.pl>
Wysłano: 18 września 2026
Do: ja@cncsolutions.dev
Temat: FW: plakaty

Od: Inspektor <inspektor@powiat.siedlce.pl>
Temat: szczepienia
`;

describe('extractForwardHops', () => {
	it('zbiera From od zewnątrz, bez duplikatów', () => {
		expect(extractForwardHops(GMAIL)).toEqual([
			'sekretariat@sp-miedzna.pl',
			'wet@powiat.siedlce.pl',
		]);
		expect(extractForwardHops(OUTLOOK)).toEqual([
			'ug@gminamiedzna.pl',
			'inspektor@powiat.siedlce.pl',
		]);
	});
});

describe('correspondentEmail', () => {
	it('bierze hop tuż przed Tobą, nie autora pisma i nie Ciebie', () => {
		expect(correspondentEmail(GMAIL, ['ja@cncsolutions.dev'])).toBe('sekretariat@sp-miedzna.pl');
		expect(correspondentEmail(OUTLOOK, ['ja@cncsolutions.dev'])).toBe('ug@gminamiedzna.pl');
		expect(correspondentEmail('Zwykła treść bez forwardu.', ['ja@cncsolutions.dev'])).toBeNull();
	});
});
