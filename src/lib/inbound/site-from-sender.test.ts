import { describe, expect, it } from 'vitest';
import { parseSiteByDomain, parseSiteByEmail, siteSlugForSender } from './site-from-sender';

const MAPS = {
	byEmail: parseSiteByEmail('dyrektor@inna-szkola.pl:sp-miedzna'),
	byDomain: parseSiteByDomain('gminamiedzna.pl:gmina-miedzna,sp-miedzna.pl:sp-miedzna'),
	defaultSlug: 'gmina-miedzna',
};

describe('siteSlugForSender', () => {
	it('email wygrywa z domeną; domena łapie poddomeny', () => {
		expect(siteSlugForSender('dyrektor@inna-szkola.pl', MAPS)).toBe('sp-miedzna');
		expect(siteSlugForSender('ug@gminamiedzna.pl', MAPS)).toBe('gmina-miedzna');
		expect(siteSlugForSender('sekretariat@sp-miedzna.pl', MAPS)).toBe('sp-miedzna');
		expect(siteSlugForSender('a@mail.sp-miedzna.pl', MAPS)).toBe('sp-miedzna');
	});

	it('brak hopu albo nieznana domena → default', () => {
		expect(siteSlugForSender(null, MAPS)).toBe('gmina-miedzna');
		expect(siteSlugForSender('wet@powiat.siedlce.pl', MAPS)).toBe('gmina-miedzna');
	});
});
