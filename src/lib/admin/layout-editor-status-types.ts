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
	publishSkipped?: boolean;
	imported?: boolean;
	importHrefCount?: number | null;
	importPath?: string | null;
};

export type LayoutEditorStatusMessages = {
	draftMissingHref: string;
	inSync: string;
	inSyncShort: string;
	draftAhead: string;
	liveAhead: string;
	draftAheadShort: string;
	lastPublished: string;
	lastDraft: string;
	savedTitle: string;
	savedNote: string;
	importedTitle: string;
	importedAndSaved: string;
	linkCount: (count: number) => string;
	publishedLayout: string;
	publishSkipped: string;
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

export function joinLayoutStatusMeta(parts: Array<string | null | undefined>): string[] {
	const line = parts.filter(Boolean).join(' · ');
	return line ? [line] : [];
}

export function emptyLayoutEditorStatus(input: LayoutEditorStatusInput): LayoutEditorStatusView {
	return {
		show: false,
		variant: 'info',
		title: '',
		metaLines: [],
		showNavIssues: false,
		navWarningLines: input.navWarningLines,
		navHasMissingHref: input.navHasMissingHref,
	};
}

export type LayoutEditorStatusDates = {
	draftLabel: string | null;
	publishedMeta: string | null;
};

export function layoutEditorStatusDates(
	input: LayoutEditorStatusInput,
	messages: LayoutEditorStatusMessages,
): LayoutEditorStatusDates {
	const draftLabel = formatLayoutStatusDate(input.lastDraftSavedAt);
	const publishedLabel = formatLayoutStatusDate(input.lastPublishedAt);
	const publishedMeta =
		publishedLabel &&
		`${messages.lastPublished} ${publishedLabel}${input.lastPublishedSha ? ` (${input.lastPublishedSha})` : ''}`;
	return { draftLabel, publishedMeta };
}
