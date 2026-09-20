import { describe, expect, it } from 'vitest';
import { pickReplaceFile, replaceDisplayMode } from './apply-replace-model';

const PDF = new Uint8Array([1, 2, 3]);

describe('pickReplaceFile', () => {
	it('bierze wskazaną nazwę; przy wielu plikach bez nazwy nie zgaduje', () => {
		const inventory = [
			{
				filename: 'stary.pdf',
				mime: 'application/pdf',
				text: '',
				pageCount: 1,
				suggestedDisplay: 'link' as const,
				bytes: PDF,
			},
			{
				filename: 'nowy.pdf',
				mime: 'application/pdf',
				text: '',
				pageCount: 1,
				suggestedDisplay: 'link' as const,
				bytes: PDF,
			},
		];
		expect(pickReplaceFile(inventory, 'nowy.pdf')?.filename).toBe('nowy.pdf');
		expect(pickReplaceFile(inventory, null)).toBeNull();
		expect(pickReplaceFile([inventory[0]!], null)?.filename).toBe('stary.pdf');
	});
});

describe('replaceDisplayMode', () => {
	it('zostawia stary tryb, chyba że Grok poda nowy', () => {
		expect(replaceDisplayMode('embed', null)).toBe('embed');
		expect(replaceDisplayMode('embed', 'link')).toBe('link');
		expect(replaceDisplayMode('link', undefined)).toBe('link');
	});
});
