import {
	emptyLayoutEditorStatus,
	joinLayoutStatusMeta,
	type LayoutEditorStatusDates,
	type LayoutEditorStatusInput,
	type LayoutEditorStatusMessages,
	type LayoutEditorStatusView,
} from './layout-editor-status-types';

export function tryLayoutEditorNavMissingHref(
	input: LayoutEditorStatusInput,
	messages: LayoutEditorStatusMessages,
	dates: LayoutEditorStatusDates,
): LayoutEditorStatusView | null {
	if (!input.navHasMissingHref) return null;
	return {
		show: true,
		variant: 'error',
		title: messages.draftMissingHref,
		metaLines: dates.draftLabel ? joinLayoutStatusMeta([`${messages.lastDraft} ${dates.draftLabel}`]) : [],
		showNavIssues: true,
		navWarningLines: input.navWarningLines,
		navHasMissingHref: true,
	};
}

export function buildLayoutEditorIdleStatus(
	input: LayoutEditorStatusInput,
	messages: LayoutEditorStatusMessages,
	dates: LayoutEditorStatusDates,
): LayoutEditorStatusView {
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

	if (input.draftStatus === 'live_ahead') {
		return {
			show: true,
			variant: 'warning',
			title: messages.liveAhead,
			metaLines: joinLayoutStatusMeta([
				dates.draftLabel ? `${messages.lastDraft} ${dates.draftLabel}` : null,
				dates.publishedMeta,
			]),
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
			metaLines: joinLayoutStatusMeta([
				dates.draftLabel ? `${messages.lastDraft} ${dates.draftLabel}` : null,
				dates.publishedMeta,
			]),
			showNavIssues: false,
			navWarningLines: input.navWarningLines,
			navHasMissingHref: false,
		};
	}

	if (input.draftStatus === 'in_sync') {
		return {
			show: true,
			variant: 'success',
			title: messages.inSync,
			metaLines: joinLayoutStatusMeta([
				dates.draftLabel ? `${messages.lastDraft} ${dates.draftLabel}` : null,
				dates.publishedMeta,
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

	return emptyLayoutEditorStatus(input);
}
