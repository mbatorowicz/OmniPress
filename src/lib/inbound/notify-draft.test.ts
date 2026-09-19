import { describe, expect, it, vi } from 'vitest';
import { APP } from '@/config/app';
import { common, notify } from '@/i18n';
import { reviewOpenOnlyKeyboard } from '@/lib/notify/review-model';
import { formatInboundDraftMessage, notifyInboundDraft } from './notify-draft';

const POST_ID = '11111111-2222-3333-4444-555555555555';

describe('formatInboundDraftMessage', () => {
	it('składa nagłówek szkicu, tytuł, hint i link bez Akceptuj', () => {
		const text = formatInboundDraftMessage({ title: 'Festyn gminny', postId: POST_ID });
		expect(text).toContain(notify.inbound.heading);
		expect(text).toContain(`${notify.inbound.titleLabel}: Festyn gminny`);
		expect(text).toContain(notify.inbound.hint);
		expect(text).toContain(`${APP.productionOrigin}/admin/posts/${POST_ID}`);
		expect(text).not.toContain(notify.review.heading);
		expect(text).not.toContain(notify.review.approveButton);
	});

	it('używa fallbacku tytułu', () => {
		expect(formatInboundDraftMessage({ title: '  ', postId: POST_ID })).toContain(common.untitled);
	});

	it('przy fallbacku Groka wstawia hint o surowym mailu', () => {
		const text = formatInboundDraftMessage(
			{ title: 'inf. o dofinasowaniu', postId: POST_ID },
			{ unprocessed: true },
		);
		expect(text).toContain(notify.inbound.unprocessedHint);
		expect(text).not.toContain(notify.inbound.hint);
	});
});

describe('notifyInboundDraft', () => {
	it('nie wysyła gdy Telegram nie jest skonfigurowany', async () => {
		const send = vi.fn();
		await notifyInboundDraft(POST_ID, 'Festyn', { configured: false, send });
		expect(send).not.toHaveBeenCalled();
	});

	it('wysyła tekst z klawiaturą tylko Otwórz w panelu', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		await notifyInboundDraft(POST_ID, 'Festyn gminny', { configured: true, send });
		expect(send).toHaveBeenCalledTimes(1);
		const [text, markup] = send.mock.calls[0] as [string, ReturnType<typeof reviewOpenOnlyKeyboard>];
		expect(text).toContain(notify.inbound.heading);
		expect(markup).toEqual(reviewOpenOnlyKeyboard(POST_ID));
		expect(JSON.stringify(markup)).not.toContain(notify.review.approveButton);
		expect(JSON.stringify(markup)).not.toContain('callback_data');
	});

	it('nie rzuca gdy send padnie', async () => {
		const send = vi.fn().mockRejectedValue(new Error('network'));
		await expect(
			notifyInboundDraft(POST_ID, 'Festyn', { configured: true, send }),
		).resolves.toBeUndefined();
	});
});
