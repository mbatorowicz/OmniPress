import { describe, expect, it } from 'vitest';
import type { EnrichDraft } from './enrich-model';
import { draftsFromClusters, appendUnassignedClusterDrafts, splitLumpedDrafts, titleFromClusterFiles } from './split-lumped-drafts';

function draft(title: string, files: string[], contentMd = `Lead: ${title}.`): EnrichDraft {
	return {
		title,
		contentMd,
		categorySlug: 'aktualnosci',
		extraCategorySlugs: [],
		attachments: files.map((filename) => ({ filename, display: 'embed' })),
	};
}

const FILES = [
	{
		filename: 'plakat_Zaszczep_pupila.jpg',
		text: 'Zaszczep pupila przeciw wściekliźnie',
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
];

describe('titleFromClusterFiles', () => {
	it('zdejmuje „plakat” i składa warianty w jeden tytuł', () => {
		expect(titleFromClusterFiles([FILES[0]!], 'x')).toBe('Zaszczep pupila');
		expect(titleFromClusterFiles([FILES[1]!, FILES[2]!], 'x')).toBe(
			'Wścieklizna – obszar zagrożony i zasady zachowania',
		);
	});
});

describe('splitLumpedDrafts', () => {
	it('rozdziela jeden szkic ze wszystkimi plikami na dwa materiały', () => {
		const drafts = splitLumpedDrafts(
			[
				draft('Zaszczep pupila – szczepienia i wścieklizna', [
					'plakat_Zaszczep_pupila.jpg',
					'Plakat_wścieklizna_obszar_zagrożony.pdf',
					'Plakat_wścieklizna_zasady_zachowania.pdf',
				]),
			],
			FILES,
		);
		expect(drafts).toHaveLength(2);
		expect(drafts[0]?.attachments.map((row) => row.filename)).toEqual([
			'plakat_Zaszczep_pupila.jpg',
		]);
		expect(drafts[1]?.attachments.map((row) => row.filename)).toEqual([
			'Plakat_wścieklizna_obszar_zagrożony.pdf',
			'Plakat_wścieklizna_zasady_zachowania.pdf',
		]);
		expect(drafts[0]?.title).toBe('Zaszczep pupila');
		expect(drafts[1]?.title).toBe('Wścieklizna – obszar zagrożony i zasady zachowania');
	});

	it('zostawia poprawny podział i nie rusza jednego materiału z dwoma plikami', () => {
		const two = [
			draft('Zaszczep pupila', ['plakat_Zaszczep_pupila.jpg']),
			draft('Wścieklizna', [
				'Plakat_wścieklizna_obszar_zagrożony.pdf',
				'Plakat_wścieklizna_zasady_zachowania.pdf',
			]),
		];
		expect(splitLumpedDrafts(two, FILES)).toEqual(two);
		expect(
			splitLumpedDrafts(
				[
					draft('Wścieklizna – obszar i zasady', [
						'Plakat_wścieklizna_obszar_zagrożony.pdf',
						'Plakat_wścieklizna_zasady_zachowania.pdf',
					]),
				],
				[FILES[1]!, FILES[2]!],
			),
		).toHaveLength(1);
	});
});

describe('draftsFromClusters', () => {
	it('z dwóch materiałów robi dwa szkice', () => {
		const drafts = draftsFromClusters(FILES, 'aktualnosci');
		expect(drafts.map((row) => row.title)).toEqual([
			'Zaszczep pupila',
			'Wścieklizna – obszar zagrożony i zasady zachowania',
		]);
		expect(drafts[1]?.attachments).toHaveLength(2);
	});
});

describe('appendUnassignedClusterDrafts', () => {
	it('dopisuje drugi materiał, gdy Grok wypisał tylko jeden plik', () => {
		const drafts = appendUnassignedClusterDrafts(
			[draft('Zaszczep pupila', ['plakat_Zaszczep_pupila.jpg'])],
			FILES,
			'aktualnosci',
		);
		expect(drafts).toHaveLength(2);
		expect(drafts[0]?.title).toBe('Zaszczep pupila');
		expect(drafts[1]?.title).toBe('Wścieklizna – obszar zagrożony i zasady zachowania');
		expect(drafts[1]?.attachments).toHaveLength(2);
	});
});
