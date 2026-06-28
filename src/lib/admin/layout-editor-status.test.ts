import { describe, expect, it } from 'vitest';
import { buildLayoutEditorStatus, type LayoutEditorStatusMessages } from './layout-editor-status';

const messages: LayoutEditorStatusMessages = {
	draftMissingHref: 'Brak linków',
	inSync: 'Menu zgodne ze stroną live',
	inSyncShort: 'zgodne ze stroną live',
	draftAhead: 'Nieopublikowane zmiany',
	liveAhead: 'Strona zmieniona poza OmniPress',
	draftAheadShort: 'wymaga publikacji',
	lastPublished: 'Publikacja',
	lastDraft: 'Zapis szkicu',
	savedTitle: 'Szkic zapisany',
	savedNote: 'Notatka',
	importedTitle: 'Menu wczytane z GitHub',
	importedAndSaved: 'Menu wczytane · szkic zapisany',
	linkCount: (n) => `${n} linków`,
	publishedLayout: 'Opublikowano',
	publishSkipped: 'Bez zmian',
	syncSummaryPrefix: 'GitHub:',
	noAstroChannel: 'Brak GitHub',
	navValidationHeading: 'Problemy menu',
	navValidationHint: 'Popraw linki',
	publishBlockedMissingHref: 'Publikacja zablokowana',
};

describe('buildLayoutEditorStatus', () => {
	it('łączy import i zgodność w jeden komunikat', () => {
		const view = buildLayoutEditorStatus(
			{
				hasAstroChannel: true,
				draftStatus: 'in_sync',
				navHasMissingHref: false,
				lastDraftSavedAt: '2026-06-27T11:24:00.000Z',
				navWarningLines: [],
				imported: true,
				importHrefCount: 32,
				importPath: 'src/config/omnipress-navigation.json',
			},
			messages,
		);

		expect(view.show).toBe(true);
		expect(view.variant).toBe('success');
		expect(view.title).toBe('Menu wczytane z GitHub');
		expect(view.metaLines[0]).toContain('32 linków');
		expect(view.metaLines[0]).toContain('zgodne ze stroną live');
		expect(view.metaLines).toHaveLength(1);
	});

	it('pokazuje jeden blok przy zapisie szkicu', () => {
		const view = buildLayoutEditorStatus(
			{
				hasAstroChannel: true,
				draftStatus: 'draft_ahead',
				navHasMissingHref: false,
				navWarningLines: [],
				saved: true,
			},
			messages,
		);

		expect(view.title).toBe('Szkic zapisany');
		expect(view.metaLines[0]).toContain('wymaga publikacji');
	});

	it('pokazuje spokojny status gdy brak akcji flash', () => {
		const view = buildLayoutEditorStatus(
			{
				hasAstroChannel: true,
				draftStatus: 'in_sync',
				navHasMissingHref: false,
				lastDraftSavedAt: '2026-06-27T11:24:00.000Z',
				navWarningLines: [],
			},
			messages,
		);

		expect(view.variant).toBe('success');
		expect(view.title).toBe('Menu zgodne ze stroną live');
	});
});
