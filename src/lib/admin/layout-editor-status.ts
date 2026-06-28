import type { DraftLiveStatus } from '@/lib/astro-layout/layout-sync-meta';

export type LayoutEditorStatusInput = {
	hasAstroChannel: boolean;
	draftStatus: DraftLiveStatus;
	navHasMissingHref: boolean;
	lastPublishedAt?: string;
	lastPublishedSha?: string;
	lastDraftSavedAt?: string;
	errorMessage?: string | null;
	errorDetail?: string | null;
	syncSummary?: string | null;
	navWarningLines: string[];
	saved?: boolean;
	published?: boolean;
	imported?: boolean;
	importHrefCount?: number | null;
	importPath?: string | null;
};

export type LayoutEditorStatusMessages = {
	draftMissingHref: string;
	inSync: string;
	inSyncShort: string;
	draftAhead: string;
	draftAheadShort: string;
	lastPublished: string;
	lastDraft: string;
	savedTitle: string;
	savedNote: string;
	importedTitle: string;
	importedAndSaved: string;
	linkCount: (count: number) => string;
	publishedLayout: string;
	syncSummaryPrefix: string;
	noAstroChannel: string;
	navValidationHeading: string;
	navValidationHint: string;
	publishBlockedMissingHref: string;
};

export type LayoutEditorStatusView = {
	show: boolean;
	variant: 'success' | 'error' | 'warning' | 'info';
	title: string;
	metaLines: string[];
	errorDetail?: string | null;
	syncSummary?: string | null;
	showNavIssues: boolean;
	navWarningLines: string[];
	navHasMissingHref: boolean;
};

export function formatLayoutStatusDate(iso?: string): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return d.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

function joinMeta(parts: Array<string | null | undefined>): string[] {
	const line = parts.filter(Boolean).join(' · ');
	return line ? [line] : [];
}

export function buildLayoutEditorStatus(
	input: LayoutEditorStatusInput,
	messages: LayoutEditorStatusMessages,
): LayoutEditorStatusView {
	const empty: LayoutEditorStatusView = {
		show: false,
		variant: 'info',
		title: '',
		metaLines: [],
		showNavIssues: false,
		navWarningLines: input.navWarningLines,
		navHasMissingHref: input.navHasMissingHref,
	};

	const draftLabel = formatLayoutStatusDate(input.lastDraftSavedAt);
	const publishedLabel = formatLayoutStatusDate(input.lastPublishedAt);
	const publishedMeta =
		publishedLabel &&
		`${messages.lastPublished} ${publishedLabel}${input.lastPublishedSha ? ` (${input.lastPublishedSha})` : ''}`;

	if (input.errorMessage) {
		return {
			show: true,
			variant: 'error',
			title: input.errorMessage,
			metaLines: [],
			errorDetail: input.errorDetail,
			showNavIssues: false,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: input.navHasMissingHref,
		};
	}

	if (input.navHasMissingHref) {
		return {
			show: true,
			variant: 'error',
			title: messages.draftMissingHref,
			metaLines: draftLabel ? joinMeta([`${messages.lastDraft} ${draftLabel}`]) : [],
			showNavIssues: true,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: true,
		};
	}

	if (input.published) {
		return {
			show: true,
			variant: 'success',
			title: messages.publishedLayout,
			metaLines: joinMeta([
				publishedMeta,
				input.syncSummary ? `${messages.syncSummaryPrefix} ${input.syncSummary}` : null,
			]),
			showNavIssues: false,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: false,
		};
	}

	const hasAction = Boolean(input.saved || input.imported);

	if (hasAction) {
		let title = messages.savedTitle;
		if (input.imported && input.saved) title = messages.importedAndSaved;
		else if (input.imported) title = messages.importedTitle;

		const metaParts: Array<string | null | undefined> = [];
		if (input.imported && input.importHrefCount != null) {
			metaParts.push(messages.linkCount(input.importHrefCount));
		}
		if (input.imported && input.importPath) metaParts.push(input.importPath);
		if (input.draftStatus === 'in_sync') metaParts.push(messages.inSyncShort);
		else if (input.draftStatus === 'draft_ahead' && input.saved) {
			metaParts.push(messages.draftAheadShort);
		}
		if (draftLabel) metaParts.push(`${messages.lastDraft} ${draftLabel}`);

		return {
			show: true,
			variant: 'success',
			title,
			metaLines: joinMeta(metaParts),
			showNavIssues: false,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: false,
		};
	}

	if (!input.hasAstroChannel) {
		return {
			show: true,
			variant: 'warning',
			title: messages.noAstroChannel,
			metaLines: [],
			showNavIssues: false,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: false,
		};
	}

	if (input.draftStatus === 'draft_ahead') {
		return {
			show: true,
			variant: 'warning',
			title: messages.draftAhead,
			metaLines: joinMeta([
				draftLabel ? `${messages.lastDraft} ${draftLabel}` : null,
				publishedMeta,
			]),
			showNavIssues: false,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: false,
		};
	}

	if (input.draftStatus === 'in_sync') {
		return {
			show: true,
			variant: 'info',
			title: messages.inSync,
			metaLines: joinMeta([
				draftLabel ? `${messages.lastDraft} ${draftLabel}` : null,
				publishedMeta,
			]),
			showNavIssues: false,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: false,
		};
	}

	if (input.navWarningLines.length > 0) {
		return {
			show: true,
			variant: 'warning',
			title: messages.navValidationHeading,
			metaLines: [messages.navValidationHint],
			showNavIssues: true,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: false,
		};
	}

	return empty;
}

export function layoutEditorStatusMessagesFromI18n(adminLayout: {
	draftStatus: {
		draftMissingHref: string;
		inSync: string;
		draftAhead: string;
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
		draftAheadShort: adminLayout.flash.draftAheadShort,
		lastPublished: adminLayout.draftStatus.lastPublished,
		lastDraft: adminLayout.draftStatus.lastDraft,
		savedTitle: adminLayout.flash.savedTitle,
		savedNote: adminLayout.flash.savedNote,
		importedTitle: adminLayout.flash.importedTitle,
		importedAndSaved: adminLayout.flash.importedAndSaved,
		linkCount: adminLayout.flash.linkCount,
		publishedLayout: adminLayout.publishedLayout,
		syncSummaryPrefix: adminLayout.syncSummaryPrefix,
		noAstroChannel: adminLayout.noAstroChannel,
		navValidationHeading: adminLayout.navValidationHeading,
		navValidationHint: adminLayout.navValidationHint,
		publishBlockedMissingHref: adminLayout.publishBlockedMissingHref,
	};
}
