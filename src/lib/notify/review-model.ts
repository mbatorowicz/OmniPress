import { APP } from '@/config/app';
import { common, notify } from '@/i18n';
import type { TelegramReplyMarkup } from './telegram';

export const TELEGRAM_APPROVE_PREFIX = 'a:';

const POST_ID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReviewNotifyInput = {
	title: string;
	siteName: string | null;
	authorName: string | null;
	postId: string;
};

export function reviewPostUrl(postId: string): string {
	return `${APP.productionOrigin}/admin/posts/${postId}`;
}

export function resolveReviewLabel(value: string | null | undefined, fallback: string): string {
	const trimmed = value?.trim();
	return trimmed || fallback;
}

export function formatReviewMessage(input: ReviewNotifyInput): string {
	const title = resolveReviewLabel(input.title, common.untitled);
	const site = resolveReviewLabel(input.siteName, notify.review.siteUnknown);
	const author = resolveReviewLabel(input.authorName, notify.review.authorUnknown);
	return [
		notify.review.heading,
		'',
		`${notify.review.titleLabel}: ${title}`,
		`${notify.review.siteLabel}: ${site}`,
		`${notify.review.authorLabel}: ${author}`,
		'',
		notify.review.hint,
		reviewPostUrl(input.postId),
	].join('\n');
}

export function reviewApproveCallbackData(postId: string): string {
	return `${TELEGRAM_APPROVE_PREFIX}${postId}`;
}

export function parseReviewApproveCallbackData(data: string | undefined): string | null {
	if (!data?.startsWith(TELEGRAM_APPROVE_PREFIX)) return null;
	const postId = data.slice(TELEGRAM_APPROVE_PREFIX.length);
	return POST_ID_RE.test(postId) ? postId : null;
}

export function reviewInlineKeyboard(postId: string): TelegramReplyMarkup {
	return {
		inline_keyboard: [
			[
				{ text: notify.review.approveButton, callback_data: reviewApproveCallbackData(postId) },
				{ text: notify.review.openButton, url: reviewPostUrl(postId) },
			],
		],
	};
}

export function reviewOpenOnlyKeyboard(postId: string): TelegramReplyMarkup {
	return {
		inline_keyboard: [[{ text: notify.review.openButton, url: reviewPostUrl(postId) }]],
	};
}

export function appendReviewResult(text: string, footer: string): string {
	if (text.includes(footer)) return text;
	return `${text}\n\n${footer}`;
}
