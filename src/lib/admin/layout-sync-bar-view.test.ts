import { describe, expect, it } from 'vitest';
import {
	buildLayoutSyncBarView,
	type LayoutSyncBarMessages,
} from './layout-sync-bar-view';

const messages: LayoutSyncBarMessages = {
	parityTitle: 'Zgodność ze stroną',
	inSync: 'Panel i strona są zgodne',
	inSyncDetail: 'Formularz pokazuje to, co jest na stronie.',
	draftAhead: 'Zmiany jeszcze nie są na stronie',
	draftAheadDetail: 'Zapisz szkic, potem opublikuj.',
	liveAhead: 'Strona ma nowszą wersję',
	liveAheadDetail: 'Wczytaj stronę, żeby pracować na aktualnym układzie.',
	legacy: 'Stary format repo',
	unknown: 'Status nieznany',
	saveBeforePublish: 'Zapisz szkic przed publikacją.',
	publish: 'Opublikuj na stronie',
	pull: 'Wczytaj ze strony',
	lastDraft: 'Zapis szkicu',
};

describe('buildLayoutSyncBarView', () => {
	it('ukrywa pasek bez kanału GitHub', () => {
		const view = buildLayoutSyncBarView(
			{
				hasAstroChannel: false,
				status: 'unknown',
				currentSection: 'navigation',
				navHasMissingHref: false,
			},
			messages,
		);
		expect(view.show).toBe(false);
	});

	it('przy zgodności nie pokazuje przycisku', () => {
		const view = buildLayoutSyncBarView(
			{
				hasAstroChannel: true,
				status: 'in_sync',
				currentSection: 'navigation',
				navHasMissingHref: false,
			},
			messages,
		);
		expect(view.show).toBe(true);
		expect(view.tone).toBe('sync');
		expect(view.title).toBe(messages.inSync);
		expect(view.action).toBeNull();
		expect(view.hint).toBeNull();
	});

	it('przy niewysłanych zmianach proponuje publikację, nie wczytanie', () => {
		const view = buildLayoutSyncBarView(
			{
				hasAstroChannel: true,
				status: 'draft_ahead',
				currentSection: 'navigation',
				navHasMissingHref: false,
				lastDraftSavedAt: '2026-09-06T11:59:00.000Z',
			},
			messages,
		);
		expect(view.tone).toBe('draft');
		expect(view.action).toBe('publish');
		expect(view.actionLabel).toBe(messages.publish);
		expect(view.hint).toBe(messages.saveBeforePublish);
		expect(view.meta).toContain(messages.lastDraft);
	});

	it('na zakładce kategorii nie dubluje publikacji z formularza', () => {
		const view = buildLayoutSyncBarView(
			{
				hasAstroChannel: true,
				status: 'draft_ahead',
				currentSection: 'categories',
				navHasMissingHref: false,
			},
			messages,
		);
		expect(view.action).toBeNull();
		expect(view.hint).toBeNull();
	});

	it('gdy strona jest nowsza, jedyna akcja to wczytanie — nie publikacja', () => {
		const view = buildLayoutSyncBarView(
			{
				hasAstroChannel: true,
				status: 'live_ahead',
				currentSection: 'navigation',
				navHasMissingHref: false,
			},
			messages,
		);
		expect(view.tone).toBe('alert');
		expect(view.action).toBe('pull');
		expect(view.actionLabel).toBe(messages.pull);
		expect(view.hint).toBeNull();
		expect(view.actionDisabled).toBe(false);
	});

	it('blokuje publikację przy brakujących linkach menu', () => {
		const view = buildLayoutSyncBarView(
			{
				hasAstroChannel: true,
				status: 'draft_ahead',
				currentSection: 'components',
				navHasMissingHref: true,
			},
			messages,
		);
		expect(view.action).toBe('publish');
		expect(view.actionDisabled).toBe(true);
	});
});
