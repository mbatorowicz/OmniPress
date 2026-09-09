import type { LayoutSyncBarMessages } from './layout-sync-bar-view';

export function layoutSyncBarMessagesFromI18n(adminLayout: {
	syncBar: {
		parityTitle: string;
		inSyncCombined: string;
		inSyncDetail: string;
		draftAheadCombined: string;
		draftAheadDetailNote: string;
		liveAheadCombined: string;
		liveAheadDetail: string;
		legacyContract: string;
		unknown: string;
		saveBeforePublish: string;
		publishAllLayout: string;
		pullFromSite: string;
	};
	draftStatus: { lastDraft: string };
}): LayoutSyncBarMessages {
	const { syncBar } = adminLayout;
	return {
		parityTitle: syncBar.parityTitle,
		inSync: syncBar.inSyncCombined,
		inSyncDetail: syncBar.inSyncDetail,
		draftAhead: syncBar.draftAheadCombined,
		draftAheadDetail: syncBar.draftAheadDetailNote,
		liveAhead: syncBar.liveAheadCombined,
		liveAheadDetail: syncBar.liveAheadDetail,
		legacy: syncBar.legacyContract,
		unknown: syncBar.unknown,
		saveBeforePublish: syncBar.saveBeforePublish,
		publish: syncBar.publishAllLayout,
		pull: syncBar.pullFromSite,
		lastDraft: adminLayout.draftStatus.lastDraft,
	};
}
