import { common, notify } from '@/i18n';
import {
	resolveReviewLabel,
	reviewOpenOnlyKeyboard,
	reviewPostUrl,
} from '@/lib/notify/review-model';
import {
	isTelegramConfigured,
	sendTelegramMessage,
	type TelegramReplyMarkup,
} from '@/lib/notify/telegram';
import { inboundPagePanelUrl } from './match-replace-model';

export type InboundNotifyKind = 'draft' | 'replace' | 'clarify' | 'failed';

export type InboundDraftNotifyInput = {
	title: string;
	postId?: string | null;
	kind?: InboundNotifyKind;
	question?: string;
	panelUrl?: string;
	siteId?: string;
	pageId?: string;
};

export type NotifyInboundDraftOptions = {
	configured?: boolean;
	send?: (text: string, replyMarkup?: TelegramReplyMarkup) => Promise<void>;
};

function headingFor(kind: InboundNotifyKind): string {
	if (kind === 'replace') return notify.inbound.replaceHeading;
	if (kind === 'clarify' || kind === 'failed') return notify.inbound.clarifyHeading;
	return notify.inbound.heading;
}

function hintFor(kind: InboundNotifyKind, question?: string): string {
	if (kind === 'replace') return notify.inbound.replaceHint;
	if (kind === 'failed') return notify.inbound.failedHint;
	if (kind === 'clarify') return question?.trim() || notify.inbound.clarifyHint;
	return notify.inbound.hint;
}

function panelUrlFor(input: InboundDraftNotifyInput): string | null {
	if (input.panelUrl) return input.panelUrl;
	if (input.postId) return reviewPostUrl(input.postId);
	if (input.siteId && input.pageId) return inboundPagePanelUrl(input.siteId, input.pageId);
	return null;
}

export function formatInboundDraftMessage(input: InboundDraftNotifyInput): string {
	const kind = input.kind ?? 'draft';
	const title = resolveReviewLabel(input.title, common.untitled);
	const url = panelUrlFor(input);
	return [
		headingFor(kind),
		'',
		`${notify.inbound.titleLabel}: ${title}`,
		'',
		hintFor(kind, input.question),
		...(url ? [url] : []),
	].join('\n');
}

/** Ping Telegram o wyniku inbound — bez klawiatury Akceptuj. */
export async function notifyInboundDraft(
	postId: string | null,
	title: string,
	opts: NotifyInboundDraftOptions & Omit<InboundDraftNotifyInput, 'title' | 'postId'> = {},
): Promise<void> {
	try {
		const configured = opts.configured ?? isTelegramConfigured();
		if (!configured) return;
		const payload: InboundDraftNotifyInput = { ...opts, title, postId };
		const text = formatInboundDraftMessage(payload);
		const replyMarkup = postId ? reviewOpenOnlyKeyboard(postId) : undefined;
		if (opts.send) {
			await opts.send(text, replyMarkup);
		} else {
			await sendTelegramMessage(text, replyMarkup ? { replyMarkup } : {});
		}
	} catch {
		// Wynik już zapisany — powiadomienie nie może go cofnąć.
	}
}
