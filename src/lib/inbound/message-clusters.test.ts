import { describe, expect, it } from 'vitest';
import { countMessageClusters, materialTokens } from './message-clusters';

describe('countMessageClusters', () => {
	it('szczepienie vs dwa plakaty o wściekliźnie → 2 sprawy', () => {
		expect(
			countMessageClusters([
				{
					filename: 'plakat_Zaszczep_pupila.jpg',
					text: '',
					suggestedDisplay: 'embed',
				},
				{
					filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf',
					text: 'Obszar zagrożony wścieklizną',
					suggestedDisplay: 'embed',
				},
				{
					filename: 'Plakat_wścieklizna_zasady_zachowania.pdf',
					text: 'Zasady zachowania przy wściekliźnie',
					suggestedDisplay: 'embed',
				},
				{
					filename: 'pismo.pdf',
					text: 'Proszę o publikację i poinformowanie mieszkańców',
					suggestedDisplay: 'drop',
				},
			]),
		).toBe(2);
	});

	it('warianty tego samego plakatu → 1 sprawa', () => {
		expect(
			countMessageClusters([
				{
					filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf',
					text: 'Obszar zagrożony wścieklizną',
					suggestedDisplay: 'embed',
				},
				{
					filename: 'Plakat_wścieklizna_zasady_zachowania.pdf',
					text: 'Zasady zachowania przy wściekliźnie',
					suggestedDisplay: 'embed',
				},
			]),
		).toBe(1);
	});

	it('festyn i nabór bez wspólnego tematu → 2 sprawy', () => {
		expect(
			countMessageClusters([
				{ filename: 'festyn-gminny.pdf', text: '', suggestedDisplay: 'embed' },
				{ filename: 'nabor-przedszkole.pdf', text: '', suggestedDisplay: 'embed' },
			]),
		).toBe(2);
	});
});

describe('materialTokens', () => {
	it('zdejmuje ogólniki z nazwy i zostawia temat', () => {
		const tokens = materialTokens('plakat_Zaszczep_pupila.jpg', '');
		expect(tokens.has('zaszczep')).toBe(true);
		expect(tokens.has('pupila')).toBe(true);
		expect(tokens.has('plakat')).toBe(false);
	});
});
