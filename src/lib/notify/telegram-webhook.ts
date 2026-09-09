import { adminReview, notify } from '@/i18n';
import { isServiceSupabaseConfigured } from '@/lib/supabase/service';
import { jsonOk } from '@/lib/api/response';
import {
	appendReviewResult,
	parseReviewApproveCallbackData,
	reviewOpenOnlyKeyboard,
} from './review-model';
import {
	answerTelegramCallback,
	editTelegramMessage,
	readTelegramConfig,
	type TelegramConfig,
} from './telegram';
import { approvePendingFromTelegram, type TelegramApproveResult } from './telegram-approve';
import {
	authorizeTelegramWebhook,
	isAllowedTelegramChat,
} from './telegram-webhook-auth';
import { parseTelegramCallbackQuery } from './telegram-update';

export type TelegramWebhookDeps = {
	config?: TelegramConfig | null;
	authorize?: typeof authorizeTelegramWebhook;
	approve?: typeof approvePendingFromTelegram;
	answer?: typeof answerTelegramCallback;
	edit?: typeof editTelegramMessage;
	serviceConfigured?: boolean;
};

function reviewErrorText(code: string): string {
	if (Object.hasOwn(adminReview.errors, code)) {
		return adminReview.errors[code as keyof typeof adminReview.errors];
	}
	return notify.review.error;
}

function outcomeForApprove(result: TelegramApproveResult): {
	toast: string;
	showAlert: boolean;
	footer: string | null;
} {
	if (result.ok) {
		const footer = result.scheduled ? adminReview.approvedScheduled : adminReview.approved;
		return { toast: footer, showAlert: false, footer };
	}
	if (result.error === 'not_pending' || result.error === 'not_approvable') {
		return { toast: notify.review.alreadyHandled, showAlert: true, footer: notify.review.alreadyHandled };
	}
	return { toast: reviewErrorText(result.error), showAlert: true, footer: null };
}

export async function handleTelegramWebhook(
	request: Request,
	deps: TelegramWebhookDeps = {},
): Promise<Response> {
	const config = deps.config !== undefined ? deps.config : readTelegramConfig();
	const authorize = deps.authorize ?? authorizeTelegramWebhook;
	if (!authorize(request, config) || !config) {
		return new Response('Unauthorized', { status: 401 });
	}

	let update: unknown;
	try {
		update = await request.json();
	} catch {
		return jsonOk({ ignored: true });
	}

	const query = parseTelegramCallbackQuery(update);
	if (!query) return jsonOk({ ignored: true });

	const answer = deps.answer ?? answerTelegramCallback;
	const edit = deps.edit ?? editTelegramMessage;
	const apiOpts = { config };

	if (!isAllowedTelegramChat(query.chatId, config.chatId)) {
		await answer(query.id, notify.review.forbidden, true, apiOpts);
		return jsonOk({ ignored: true });
	}

	const postId = parseReviewApproveCallbackData(query.data);
	if (!postId) {
		await answer(query.id, notify.review.error, true, apiOpts);
		return jsonOk({ ignored: true });
	}

	const serviceOk = deps.serviceConfigured ?? isServiceSupabaseConfigured();
	if (!serviceOk) {
		await answer(query.id, notify.review.error, true, apiOpts);
		return jsonOk({ error: 'service_role' });
	}

	const result = await (deps.approve ?? approvePendingFromTelegram)(postId);
	const outcome = outcomeForApprove(result);
	await answer(query.id, outcome.toast, outcome.showAlert, apiOpts);

	if (query.messageId && query.text && outcome.footer) {
		await edit(
			{
				chatId: query.chatId,
				messageId: query.messageId,
				text: appendReviewResult(query.text, outcome.footer),
				replyMarkup: reviewOpenOnlyKeyboard(postId),
			},
			apiOpts,
		);
	}

	return jsonOk({ handled: true, ok: result.ok });
}
