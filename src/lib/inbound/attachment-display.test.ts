import { describe, expect, it } from 'vitest';
import { PDF_MIME } from '@/lib/posts/upload-mime';
import { applyCoverLetterDrops, suggestAttachmentDisplay } from './attachment-display';

describe('suggestAttachmentDisplay', () => {
	it('krótki PDF 1 strona albo nazwa plakat → embed', () => {
		expect(
			suggestAttachmentDisplay({
				filename: 'skan.pdf',
				mime: PDF_MIME,
				pageCount: 1,
				text: '',
			}),
		).toBe('embed');
		expect(
			suggestAttachmentDisplay({
				filename: 'Plakat-festyn.pdf',
				mime: PDF_MIME,
				pageCount: 4,
				text: 'Festyn gminny w sobotę na stadionie. Zapraszamy rodziny z dziećmi.',
			}),
		).toBe('embed');
	});

	it('pismo z prośbą o publikację → drop; uchwała → link', () => {
		expect(
			suggestAttachmentDisplay({
				filename: 'pismo.pdf',
				mime: PDF_MIME,
				pageCount: 1,
				text: 'Szanowny Panie Wójcie, proszę o publikację załączonych materiałów i poinformowanie mieszkańców.',
			}),
		).toBe('drop');
		expect(
			suggestAttachmentDisplay({
				filename: 'uchwala.pdf',
				mime: PDF_MIME,
				pageCount: 12,
				text: 'Uchwała nr XII/80/2026 Rady Gminy Miedzna w sprawie festynu. '.repeat(20),
			}),
		).toBe('link');
	});

	it('obraz z maila to materiał do pokazania', () => {
		expect(
			suggestAttachmentDisplay({
				filename: 'plakat_Zaszczep_pupila.jpg',
				mime: 'image/jpeg',
				pageCount: null,
				text: '',
			}),
		).toBe('embed');
	});
});

describe('applyCoverLetterDrops', () => {
	it('przy plakatach zdejmuje pismo z nazwy, nawet bez frazy „proszę o publikację”', () => {
		const rows = applyCoverLetterDrops([
			{
				filename: 'plakat_Zaszczep_pupila.jpg',
				suggestedDisplay: 'embed' as const,
			},
			{
				filename: 'Pismo do przedstawicieli służb i samorządów — kopia.pdf',
				suggestedDisplay: 'link' as const,
				text: 'Szanowni Państwo, w załączeniu materiały do wiadomości.',
			},
		]);
		expect(rows[0]?.suggestedDisplay).toBe('embed');
		expect(rows[1]?.suggestedDisplay).toBe('drop');
	});

	it('samo pismo bez innych materiałów zostaje (może być treścią wpisu)', () => {
		const rows = applyCoverLetterDrops([
			{
				filename: 'Pismo wójta do mieszkańców.pdf',
				suggestedDisplay: 'link' as const,
			},
		]);
		expect(rows[0]?.suggestedDisplay).toBe('link');
	});
});
