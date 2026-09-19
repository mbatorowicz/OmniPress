import { describe, expect, it } from 'vitest';
import { buildAttachmentDecisions } from './attachment-assign';

describe('buildAttachmentDecisions', () => {
	it('przypisuje pliki do szkiców i resztę do pierwszego z heurystyką', () => {
		const map = buildAttachmentDecisions(
			[
				{ attachments: [{ filename: 'a.pdf', display: 'embed' }] },
				{ attachments: [{ filename: 'pismo.pdf', display: 'drop' }] },
			],
			['p1', 'p2'],
			[
				{
					filename: 'a.pdf',
					mime: 'application/pdf',
					text: '',
					pageCount: 1,
					suggestedDisplay: 'embed',
				},
				{
					filename: 'pismo.pdf',
					mime: 'application/pdf',
					text: 'proszę',
					pageCount: 1,
					suggestedDisplay: 'drop',
				},
				{
					filename: 'foto.png',
					mime: 'image/png',
					text: '',
					pageCount: null,
					suggestedDisplay: 'link',
				},
			],
		);
		expect(map.get('a.pdf')).toEqual({ postId: 'p1', display: 'embed' });
		expect(map.get('pismo.pdf')).toEqual({ postId: 'p2', display: 'drop' });
		expect(map.get('foto.png')).toEqual({ postId: 'p1', display: 'link' });
	});
});
