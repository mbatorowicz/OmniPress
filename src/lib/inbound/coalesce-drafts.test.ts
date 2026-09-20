import { describe, expect, it } from 'vitest';
import { coalesceDrafts, collapseToSingleDraft, mergeDraftTitles, omitCoverLetterDrafts } from './coalesce-drafts';
import type { EnrichDraft } from './enrich-model';

function draft(title: string, files: string[]): EnrichDraft {
	return {
		title,
		contentMd: `Lead: ${title}.`,
		categorySlug: 'aktualnosci',
		extraCategorySlugs: [],
		attachments: files.map((filename) => ({ filename, display: 'embed' })),
	};
}

describe('mergeDraftTitles', () => {
	it('bierze wspólny początek, nie skleja podtytułów', () => {
		expect(
			mergeDraftTitles(['Wścieklizna - obszar zagrożony', 'Wścieklizna - zasady zachowania']),
		).toBe('Wścieklizna');
	});
});

describe('coalesceDrafts', () => {
	it('scala wpisy-per-plik, gdy nazwy wskazują ten sam komunikat', () => {
		const drafts = coalesceDrafts(
			[
				draft('Zaszczep pupila', ['plakat_Zaszczep_pupila.jpg']),
				draft('Wścieklizna - obszar zagrożony', ['Plakat_wścieklizna_obszar_zagrożony.pdf']),
				draft('Wścieklizna - zasady zachowania', ['Plakat_wścieklizna_zasady_zachowania.pdf']),
			],
			[
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
			],
		);
		expect(drafts).toHaveLength(2);
		expect(drafts[0]?.title).toBe('Zaszczep pupila');
		expect(drafts[0]?.attachments.map((row) => row.filename)).toEqual([
			'plakat_Zaszczep_pupila.jpg',
		]);
		expect(drafts[1]?.title).toBe('Wścieklizna');
		expect(drafts[1]?.attachments.map((row) => row.filename)).toEqual([
			'Plakat_wścieklizna_obszar_zagrożony.pdf',
			'Plakat_wścieklizna_zasady_zachowania.pdf',
		]);
	});

	it('nie rusza już poprawnego podziału', () => {
		const input = [
			draft('Festyn gminny', ['festyn-gminny.pdf']),
			draft('Nabór do przedszkola', ['nabor-przedszkole.pdf']),
		];
		expect(
			coalesceDrafts(input, [
				{ filename: 'festyn-gminny.pdf', text: '', suggestedDisplay: 'embed' },
				{ filename: 'nabor-przedszkole.pdf', text: '', suggestedDisplay: 'embed' },
			]),
		).toEqual(input);
	});

	it('usuwa wpis, który jest tylko pismem przewodnim przy innych materiałach', () => {
		const drafts = omitCoverLetterDrafts(
			[
				draft('Zaszczep pupila', ['plakat_Zaszczep_pupila.jpg']),
				draft('Wścieklizna', [
					'Plakat_wścieklizna_obszar_zagrożony.pdf',
					'Plakat_wścieklizna_zasady_zachowania.pdf',
				]),
				{
					...draft('Pismo do służb', ['Pismo do przedstawicieli służb i samorządów — kopia.pdf']),
					attachments: [
						{
							filename: 'Pismo do przedstawicieli służb i samorządów — kopia.pdf',
							display: 'link',
						},
					],
				},
			],
			[
				{ filename: 'plakat_Zaszczep_pupila.jpg', text: '', suggestedDisplay: 'embed' },
				{
					filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf',
					text: '',
					suggestedDisplay: 'embed',
				},
				{
					filename: 'Plakat_wścieklizna_zasady_zachowania.pdf',
					text: '',
					suggestedDisplay: 'embed',
				},
				{
					filename: 'Pismo do przedstawicieli służb i samorządów — kopia.pdf',
					text: '',
					suggestedDisplay: 'drop',
				},
			],
		);
		expect(drafts).toHaveLength(2);
		expect(drafts.map((row) => row.title)).toEqual(['Zaszczep pupila', 'Wścieklizna']);
	});
});

describe('collapseToSingleDraft', () => {
	it('składa kilka posts[] w jeden szkic', () => {
		const drafts = collapseToSingleDraft([
			draft('Festyn gminny', ['festyn-gminny.pdf']),
			draft('Nabór do przedszkola', ['nabor-przedszkole.pdf']),
		]);
		expect(drafts).toHaveLength(1);
		expect(drafts[0]?.attachments.map((row) => row.filename)).toEqual([
			'festyn-gminny.pdf',
			'nabor-przedszkole.pdf',
		]);
	});
});
