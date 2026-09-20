import { describe, expect, it } from 'vitest';
import { inboundAi } from '@/i18n';
import { buildInboundEnrichPrompt } from './enrich-prompt';

describe('buildInboundEnrichPrompt', () => {
	it('składa temat, treść, załączniki i kategorie', () => {
		const prompt = buildInboundEnrichPrompt({
			title: 'Proszę o publikację',
			contentMd: 'W załączeniu pismo.',
			attachments: [
				{
					filename: 'a.pdf',
					mime: 'application/pdf',
					text: 'Treść uchwały',
					pageCount: 1,
					suggestedDisplay: 'link',
				},
			],
			categories: [
				{ slug: 'aktualnosci', name: 'Aktualności' },
				{ slug: 'ochrona-ludnosci', name: 'Ochrona ludności' },
				{ slug: 'rok-szkolny-2025-2026', name: 'Rok szkolny 2025/2026' },
			],
		});
		expect(inboundAi.system).toContain('Oglądasz treść maila');
		expect(inboundAi.system).toContain('jeden mail = jeden wpis');
		expect(inboundAi.system).not.toContain('Kilka nowych plakatów');
		expect(inboundAi.system).toContain('Nie zgaduj z nazw plików');
		expect(inboundAi.system).toContain('jak tytuł newsa');
		expect(inboundAi.system).not.toContain('Zaszczep pupila');
		expect(inboundAi.system).toContain('hint musi być konkretny');
		expect(inboundAi.system).toContain('październik czytany jako luty');
		expect(inboundAi.system).toContain('M-i-e-d-z-n-a');
		expect(prompt).toContain('Proszę o publikację');
		expect(prompt).toContain('a.pdf');
		expect(prompt).toContain('Treść uchwały');
		expect(prompt).toContain('aktualnosci: Aktualności — ');
		expect(prompt).toContain(inboundAi.categoryHints.aktualnosci);
		expect(prompt).toContain(inboundAi.categoryHints['ochrona-ludnosci']);
		expect(prompt).toContain('- rok-szkolny-2025-2026: Rok szkolny 2025/2026');
		expect(prompt).not.toContain('rok-szkolny-2025-2026: Rok szkolny 2025/2026 —');
		expect(prompt).toContain(inboundAi.onePostReminder);
		expect(prompt).toContain(inboundAi.visionNote);
		expect(prompt).toContain(inboundAi.dateCheck);
	});

	it('nie dopisuje klastrów z nazw', () => {
		const prompt = buildInboundEnrichPrompt({
			title: 'Plakaty',
			contentMd: 'Proszę opublikować.',
			attachments: [
				{
					filename: 'plakat_Zaszczep_pupila.jpg',
					mime: 'image/jpeg',
					text: '',
					pageCount: null,
					suggestedDisplay: 'embed',
				},
				{
					filename: 'Plakat_wścieklizna_obszar_zagrożony.pdf',
					mime: 'application/pdf',
					text: 'Obszar zagrożony',
					pageCount: 1,
					suggestedDisplay: 'embed',
				},
			],
			categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
		});
		expect(prompt).toContain('plakat_Zaszczep_pupila.jpg');
		expect(prompt).not.toContain('Sygnał z nazw plików');
		expect(prompt).not.toContain('1. plakat_Zaszczep_pupila.jpg');
	});

	it('dopisuje nazwę jednostki do przepisania', () => {
		const prompt = buildInboundEnrichPrompt({
			title: 'Plakaty',
			contentMd: 'Proszę opublikować.',
			attachments: [],
			categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
			siteName: 'Gmina Miedzna',
		});
		expect(prompt).toContain(`${inboundAi.siteLabel}: Gmina Miedzna`);
		expect(prompt).toContain(inboundAi.siteNameNote);
	});
});
