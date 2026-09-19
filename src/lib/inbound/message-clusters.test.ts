import { describe, expect, it } from 'vitest';
import {
	countMessageClusters,
	filenameTopicTokens,
	groupMessageClusters,
	materialTokens,
} from './message-clusters';

const VACCINE = {
	filename: 'plakat_Zaszczep_pupila.jpg',
	text: '',
	suggestedDisplay: 'embed',
};
const RABIES_AREA = {
	filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf',
	text: 'Obszar zagrożony wścieklizną',
	suggestedDisplay: 'embed',
};
const RABIES_RULES = {
	filename: 'Plakat_wścieklizna_zasady_zachowania.pdf',
	text: 'Zasady zachowania przy wściekliźnie',
	suggestedDisplay: 'embed',
};
const COVER = {
	filename: 'pismo.pdf',
	text: 'Proszę o publikację i poinformowanie mieszkańców',
	suggestedDisplay: 'drop',
};

describe('countMessageClusters', () => {
	it('dwa tematy w nazwach + warianty tego samego tematu → 2 sprawy', () => {
		expect(countMessageClusters([VACCINE, RABIES_AREA, RABIES_RULES, COVER])).toBe(2);
		expect(groupMessageClusters([VACCINE, RABIES_AREA, RABIES_RULES, COVER])).toEqual([
			{ filenames: [VACCINE.filename] },
			{ filenames: [RABIES_AREA.filename, RABIES_RULES.filename] },
		]);
	});

	it('pokrewna dziedzina w treści nie skleja osobnych nazw', () => {
		expect(
			countMessageClusters([
				{ ...VACCINE, text: 'Zaszczep pupila przeciw wściekliźnie' },
				RABIES_AREA,
				RABIES_RULES,
			]),
		).toBe(2);
	});

	it('warianty tego samego plakatu → 1 sprawa', () => {
		expect(countMessageClusters([RABIES_AREA, RABIES_RULES])).toBe(1);
	});

	it('pismo przewodnie przy plakatach nie tworzy trzeciej sprawy', () => {
		expect(
			countMessageClusters([
				VACCINE,
				RABIES_AREA,
				RABIES_RULES,
				{
					filename: 'Pismo do przedstawicieli służb i samorządów — kopia.pdf',
					text: 'Szanowni Państwo, w załączeniu materiały.',
					suggestedDisplay: 'drop',
				},
			]),
		).toBe(2);
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

describe('materialTokens / filenameTopicTokens', () => {
	it('zdejmuje ogólniki z nazwy i zostawia temat', () => {
		const tokens = materialTokens('plakat_Zaszczep_pupila.jpg', '');
		expect(tokens.has('zaszczep')).toBe(true);
		expect(tokens.has('pupila')).toBe(true);
		expect(tokens.has('plakat')).toBe(false);
		expect(filenameTopicTokens('plakat_Zaszczep_pupila.jpg').has('zaszczep')).toBe(true);
		expect(filenameTopicTokens('Plakat_wścieklizna_obszar_zagrożony.pdf').has('wscieklizna')).toBe(
			true,
		);
	});
});
