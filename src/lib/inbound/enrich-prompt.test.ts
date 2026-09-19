import { describe, expect, it } from 'vitest';
import { inboundAi } from '@/i18n';
import { buildInboundEnrichPrompt } from './enrich-prompt';

describe('buildInboundEnrichPrompt', () => {
	it('składa temat, treść, załączniki i kategorie', () => {
		const prompt = buildInboundEnrichPrompt({
			title: 'Proszę o publikację',
			contentMd: 'W załączeniu pismo.',
			attachments: [{ filename: 'a.pdf', mime: 'application/pdf', text: 'Treść uchwały' }],
			categories: [{ slug: 'aktualnosci', name: 'Aktualności' }],
		});
		expect(inboundAi.system).toContain('pismo przewodnie');
		expect(prompt).toContain('Proszę o publikację');
		expect(prompt).toContain('a.pdf');
		expect(prompt).toContain('Treść uchwały');
		expect(prompt).toContain('aktualnosci: Aktualności');
	});
});
