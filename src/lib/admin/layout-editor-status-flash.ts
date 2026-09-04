import {
	joinLayoutStatusMeta,
	type LayoutEditorStatusDates,
	type LayoutEditorStatusInput,
	type LayoutEditorStatusMessages,
	type LayoutEditorStatusView,
} from './layout-editor-status-types';

export function tryLayoutEditorErrorStatus(
	input: LayoutEditorStatusInput,
): LayoutEditorStatusView | null {
	if (!input.errorMessage) return null;
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

export function tryLayoutEditorActionStatus(
	input: LayoutEditorStatusInput,
	messages: LayoutEditorStatusMessages,
	dates: LayoutEditorStatusDates,
): LayoutEditorStatusView | null {
	if (input.publishSkipped) {
		return {
			show: true,
			variant: 'info',
			title: messages.publishSkipped,
			metaLines: joinLayoutStatusMeta([
				input.syncSummary ? `${messages.syncSummaryPrefix} ${input.syncSummary}` : null,
			]),
			showNavIssues: false,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: false,
		};
	}

	if (input.published) {
		return {
			show: true,
			variant: 'success',
			title: messages.publishedLayout,
			metaLines: joinLayoutStatusMeta([
				dates.publishedMeta,
				input.syncSummary ? `${messages.syncSummaryPrefix} ${input.syncSummary}` : null,
			]),
			showNavIssues: false,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: false,
		};
	}

	const hasAction = Boolean(input.saved || input.imported);
	if (!hasAction) return null;

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
	if (dates.draftLabel) metaParts.push(`${messages.lastDraft} ${dates.draftLabel}`);

	return {
		show: true,
		variant: 'success',
		title,
		metaLines: joinLayoutStatusMeta(metaParts),
		showNavIssues: false,
		navWarningLines: input.navWarningLines,
		navHasMissingHref: false,
	};
}
