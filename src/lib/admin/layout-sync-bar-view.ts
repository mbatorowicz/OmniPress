import type { DraftLiveStatus } from '@/lib/astro-layout/layout-sync-meta';
import type { LayoutContract } from '@/lib/astro-layout/types';
import { formatLayoutStatusDate } from './layout-editor-status-types';

export type LayoutSyncBarAction = 'publish' | 'pull';

export type LayoutSyncBarTone = 'sync' | 'draft' | 'alert';

export type LayoutSyncBarMessages = {
	parityTitle: string;
	inSync: string;
	inSyncDetail: string;
	draftAhead: string;
	draftAheadDetail: string;
	liveAhead: string;
	liveAheadDetail: string;
	legacy: string;
	unknown: string;
	saveBeforePublish: string;
	publish: string;
	pull: string;
	lastDraft: string;
};

export type LayoutSyncBarInput = {
	hasAstroChannel: boolean;
	status: DraftLiveStatus;
	layoutContract?: LayoutContract;
	currentSection: string;
	navHasMissingHref: boolean;
	lastDraftSavedAt?: string;
};

export type LayoutSyncBarView = {
	show: boolean;
	tone: LayoutSyncBarTone;
	title: string;
	detail: string | null;
	hint: string | null;
	meta: string | null;
	action: LayoutSyncBarAction | null;
	actionLabel: string;
	actionDisabled: boolean;
};

function draftMeta(savedAt: string | undefined, lastDraft: string): string | null {
	const label = formatLayoutStatusDate(savedAt);
	return label ? `${lastDraft} ${label}` : null;
}

export function buildLayoutSyncBarView(
	input: LayoutSyncBarInput,
	messages: LayoutSyncBarMessages,
): LayoutSyncBarView {
	const hidden: LayoutSyncBarView = {
		show: false,
		tone: 'sync',
		title: '',
		detail: null,
		hint: null,
		meta: null,
		action: null,
		actionLabel: '',
		actionDisabled: false,
	};

	if (!input.hasAstroChannel) return hidden;

	const isLegacy = input.layoutContract === 'legacy';
	const canPublishOnBar = input.currentSection !== 'categories';

	if (isLegacy) {
		return {
			show: true,
			tone: 'alert',
			title: messages.legacy,
			detail: null,
			hint: null,
			meta: null,
			action: null,
			actionLabel: '',
			actionDisabled: true,
		};
	}

	if (input.status === 'live_ahead') {
		return {
			show: true,
			tone: 'alert',
			title: messages.liveAhead,
			detail: messages.liveAheadDetail,
			hint: null,
			meta: draftMeta(input.lastDraftSavedAt, messages.lastDraft),
			action: 'pull',
			actionLabel: messages.pull,
			actionDisabled: false,
		};
	}

	if (input.status === 'draft_ahead') {
		return {
			show: true,
			tone: 'draft',
			title: messages.draftAhead,
			detail: messages.draftAheadDetail,
			hint: canPublishOnBar ? messages.saveBeforePublish : null,
			meta: draftMeta(input.lastDraftSavedAt, messages.lastDraft),
			action: canPublishOnBar ? 'publish' : null,
			actionLabel: messages.publish,
			actionDisabled: input.navHasMissingHref,
		};
	}

	if (input.status === 'unknown') {
		return {
			show: true,
			tone: 'alert',
			title: messages.unknown,
			detail: null,
			hint: null,
			meta: null,
			action: null,
			actionLabel: '',
			actionDisabled: false,
		};
	}

	return {
		show: true,
		tone: 'sync',
		title: messages.inSync,
		detail: messages.inSyncDetail,
		hint: null,
		meta: null,
		action: null,
		actionLabel: '',
		actionDisabled: false,
	};
}
