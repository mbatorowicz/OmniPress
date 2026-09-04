import type { LayoutEditorStatusMessages } from './layout-editor-status-types';

export function layoutEditorStatusMessagesFromI18n(adminLayout: {
	draftStatus: {
		draftMissingHref: string;
		inSync: string;
		inSyncCombined: string;
		draftAhead: string;
		liveAhead: string;
		lastPublished: string;
		lastDraft: string;
	};
	flash: {
		inSyncShort: string;
		draftAheadShort: string;
		savedTitle: string;
		savedNote: string;
		importedTitle: string;
		importedAndSaved: string;
		linkCount: (count: number) => string;
	};
	publishedLayout: string;
	publishSkipped: string;
	syncSummaryPrefix: string;
	noAstroChannel: string;
	navValidationHeading: string;
	navValidationHint: string;
	publishBlockedMissingHref: string;
}): LayoutEditorStatusMessages {
	return {
		draftMissingHref: adminLayout.draftStatus.draftMissingHref,
		inSync: adminLayout.draftStatus.inSyncCombined,
		inSyncShort: adminLayout.flash.inSyncShort,
		draftAhead: adminLayout.draftStatus.draftAhead,
		liveAhead: adminLayout.draftStatus.liveAhead,
		draftAheadShort: adminLayout.flash.draftAheadShort,
		lastPublished: adminLayout.draftStatus.lastPublished,
		lastDraft: adminLayout.draftStatus.lastDraft,
		savedTitle: adminLayout.flash.savedTitle,
		savedNote: adminLayout.flash.savedNote,
		importedTitle: adminLayout.flash.importedTitle,
		importedAndSaved: adminLayout.flash.importedAndSaved,
		linkCount: adminLayout.flash.linkCount,
		publishedLayout: adminLayout.publishedLayout,
		publishSkipped: adminLayout.publishSkipped,
		syncSummaryPrefix: adminLayout.syncSummaryPrefix,
		noAstroChannel: adminLayout.noAstroChannel,
		navValidationHeading: adminLayout.navValidationHeading,
		navValidationHint: adminLayout.navValidationHint,
		publishBlockedMissingHref: adminLayout.publishBlockedMissingHref,
	};
}
