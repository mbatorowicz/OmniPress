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
		expect(inboundAi.system).toContain('pismo przewodnie');
		expect(inboundAi.system).toContain('Nie streszczaj kilku spraw');
		expect(inboundAi.system).toContain('domyślny wybór na komunikat dla mieszkańców');
		expect(prompt).toContain('Proszę o publikację');
		expect(prompt).toContain('a.pdf');
		expect(prompt).toContain('Treść uchwały');
		expect(prompt).toContain('aktualnosci: Aktualności — ');
		expect(prompt).toContain(inboundAi.categoryHints.aktualnosci);
		expect(prompt).toContain(inboundAi.categoryHints['ochrona-ludnosci']);
		expect(prompt).toContain('- rok-szkolny-2025-2026: Rok szkolny 2025/2026');
		expect(prompt).not.toContain('rok-szkolny-2025-2026: Rok szkolny 2025/2026 —');
		expect(prompt).toContain(inboundAi.splitReminder);
	});
});
