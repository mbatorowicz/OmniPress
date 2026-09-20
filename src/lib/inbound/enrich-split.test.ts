import { describe, expect, it } from 'vitest';
import { needsSplitRetry, pickSplitRetryOutcome } from './enrich-split';
import type { EnrichOutcome } from './enrich-outcome';
import type { EnrichDraft } from './enrich-model';

function draft(title: string, files: string[]): EnrichDraft {
	return {
		title,
		contentMd: title,
		categorySlug: 'aktualnosci',
		extraCategorySlugs: [],
		attachments: files.map((filename) => ({ filename, display: 'embed' })),
	};
}

const VACCINE = {
	filename: 'plakat_Zaszczep_pupila.jpg',
	text: '',
	suggestedDisplay: 'embed',
};
const AREA = {
	filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf',
	text: 'Obszar zagrożony wścieklizną',
	suggestedDisplay: 'embed',
};
const RULES = {
	filename: 'Plakat_wścieklizna_zasady_zachowania.pdf',
	text: 'Zasady zachowania przy wściekliźnie',
	suggestedDisplay: 'embed',
};

const lumped: EnrichOutcome = {
	kind: 'create',
	drafts: [
		draft('Zaszczep pupila', [VACCINE.filename, AREA.filename, RULES.filename]),
	],
};

describe('needsSplitRetry', () => {
	it('jeden szkic przy dwóch sprawach w przesyłce → druga tura', () => {
		expect(needsSplitRetry(lumped, [VACCINE, AREA, RULES])).toBe(true);
	});

	it('już dwa szkice albo jedna sprawa → bez retry', () => {
		expect(
			needsSplitRetry(
				{
					kind: 'create',
					drafts: [
						draft('Zaszczep pupila', [VACCINE.filename]),
						draft('Wścieklizna', [AREA.filename, RULES.filename]),
					],
				},
				[VACCINE, AREA, RULES],
			),
		).toBe(false);
		expect(needsSplitRetry(lumped, [AREA, RULES])).toBe(false);
		expect(needsSplitRetry({ kind: 'failed' }, [VACCINE, AREA, RULES])).toBe(false);
	});
});

describe('pickSplitRetryOutcome', () => {
	it('bierze drugą turę tylko gdy rozdzieliła', () => {
		const split: EnrichOutcome = {
			kind: 'create',
			drafts: [
				draft('Zaszczep pupila', [VACCINE.filename]),
				draft('Wścieklizna', [AREA.filename, RULES.filename]),
			],
		};
		expect(pickSplitRetryOutcome(lumped, split)).toEqual(split);
		expect(pickSplitRetryOutcome(lumped, lumped)).toEqual(lumped);
		expect(pickSplitRetryOutcome(lumped, { kind: 'failed' })).toEqual(lumped);
	});
});
