import { describe, expect, it } from 'vitest';
import { buildLayoutEditorStatus, type LayoutEditorStatusMessages } from './layout-editor-status';

const messages: LayoutEditorStatusMessages = {
	draftMissingHref: 'Brak linków',
	inSyncShort: 'zgodne ze stroną',
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
	remapPublishedNote: (count) => `Republika: ${count}`,
	remapPublishedNone: 'Brak republikacji',
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
		expect(view.metaLines[0]).toContain('zgodne ze stroną');
		expect(view.metaLines).toHaveLength(1);
	});

	it('dopisuje liczbę wpisów do republiki po remap slugu', () => {
		const view = buildLayoutEditorStatus(
			{
				hasAstroChannel: true,
				draftStatus: 'draft_ahead',
				navHasMissingHref: false,
				navWarningLines: [],
				saved: true,
				remapPublished: 3,
			},
			messages,
		);
		expect(view.metaLines[0]).toContain('Republika: 3');
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

	it('nie dubluje paska zgodności gdy brak akcji flash', () => {
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

		expect(view.show).toBe(false);
	});

	it('nie dubluje paska przy nowszej stronie', () => {
		const view = buildLayoutEditorStatus(
			{
				hasAstroChannel: true,
				draftStatus: 'live_ahead',
				navHasMissingHref: false,
				navWarningLines: [],
			},
			messages,
		);
		expect(view.show).toBe(false);
	});
});
