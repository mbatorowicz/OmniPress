import type { LayoutEditorStatusMessages } from './layout-editor-status-types';

export function layoutEditorStatusMessagesFromI18n(adminLayout: {
	draftStatus: {
		draftMissingHref: string;
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
	remapPublishedNote: (count: number) => string;
	remapPublishedNone: string;
}): LayoutEditorStatusMessages {
	return {
		draftMissingHref: adminLayout.draftStatus.draftMissingHref,
		inSyncShort: adminLayout.flash.inSyncShort,
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
		remapPublishedNote: adminLayout.remapPublishedNote,
		remapPublishedNone: adminLayout.remapPublishedNone,
	};
}
