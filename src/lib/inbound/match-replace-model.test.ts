import { describe, expect, it } from 'vitest';
import {
	decideReplaceMatch,
	extractPublicPath,
	inboundPagePanelUrl,
	inboundPostPanelUrl,
	pathSegments,
	sameFilename,
	storageBasename,
} from './match-replace-model';
import { APP } from '@/config/app';

describe('match-replace-model', () => {
	it('wyciąga ścieżkę z URL i z gołego path', () => {
		expect(extractPublicPath('https://gmina-miedzna.pl/aktualnosci/festyn?x=1')).toBe(
			'/aktualnosci/festyn',
		);
		expect(extractPublicPath('/bip/statut')).toBe('/bip/statut');
		expect(pathSegments('/aktualnosci/festyn')).toEqual(['aktualnosci', 'festyn']);
		expect(extractPublicPath('Festyn gminny')).toBeNull();
	});

	it('paruje nazwę pliku z basename storage_path', () => {
		expect(sameFilename('Ulotka.PDF', 'ulotka.pdf')).toBe(true);
		expect(storageBasename('post-id/abc-uuid.pdf')).toBe('abc-uuid.pdf');
		expect(decideReplaceMatch([{ kind: 'post', id: '1', siteId: 's', title: 'A' }]).status).toBe(
			'exact',
		);
		expect(
			decideReplaceMatch([
				{ kind: 'post', id: '1', siteId: 's', title: 'A' },
				{ kind: 'page', id: '2', siteId: 's', title: 'B' },
			]).status,
		).toBe('ambiguous');
		expect(decideReplaceMatch([]).status).toBe('none');
	});

	it('składa link panelu', () => {
		expect(inboundPostPanelUrl('11111111-1111-4111-8111-111111111111')).toBe(
			`${APP.productionOrigin}/admin/posts/11111111-1111-4111-8111-111111111111`,
		);
		expect(inboundPagePanelUrl('site-1', 'page-1')).toBe(
			`${APP.productionOrigin}/admin/units/site-1/pages/page-1`,
		);
	});
});
