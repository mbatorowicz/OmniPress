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

export type InboundDraftNotifyInput = {
	title: string;
	postId: string;
};

export type NotifyInboundDraftOptions = {
	configured?: boolean;
	send?: (text: string, replyMarkup: TelegramReplyMarkup) => Promise<void>;
};

export function formatInboundDraftMessage(input: InboundDraftNotifyInput): string {
	const title = resolveReviewLabel(input.title, common.untitled);
	return [
		notify.inbound.heading,
		'',
		`${notify.inbound.titleLabel}: ${title}`,
		'',
		notify.inbound.hint,
		reviewPostUrl(input.postId),
	].join('\n');
}

/** Ping Telegram o szkicu z poczty — bez klawiatury Akceptuj. */
export async function notifyInboundDraft(
	postId: string,
	title: string,
	opts: NotifyInboundDraftOptions = {},
): Promise<void> {
	try {
		const configured = opts.configured ?? isTelegramConfigured();
		if (!configured) return;
		const text = formatInboundDraftMessage({ title, postId });
		const replyMarkup = reviewOpenOnlyKeyboard(postId);
		if (opts.send) {
			await opts.send(text, replyMarkup);
		} else {
			await sendTelegramMessage(text, { replyMarkup });
		}
	} catch {
		// Szkic już zapisany — powiadomienie nie może go cofnąć.
	}
}
