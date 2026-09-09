import { describe, expect, it } from 'vitest';
import { APP } from '@/config/app';
import { common, notify } from '@/i18n';
import {
	appendReviewResult,
	formatReviewMessage,
	parseReviewApproveCallbackData,
	resolveReviewLabel,
	reviewApproveCallbackData,
	reviewInlineKeyboard,
	reviewOpenOnlyKeyboard,
	reviewPostUrl,
} from './review-model';

const POST_ID = '11111111-2222-3333-4444-555555555555';

describe('reviewPostUrl', () => {
	it('prowadzi na produkcję, nie na localhost', () => {
		expect(reviewPostUrl(POST_ID)).toBe(`${APP.productionOrigin}/admin/posts/${POST_ID}`);
		expect(reviewPostUrl(POST_ID)).not.toContain('localhost');
	});
});

describe('resolveReviewLabel', () => {
	it('obcina puste i zwraca fallback', () => {
		expect(resolveReviewLabel('  Jan  ', 'x')).toBe('Jan');
		expect(resolveReviewLabel('   ', notify.review.authorUnknown)).toBe(
			notify.review.authorUnknown,
		);
		expect(resolveReviewLabel(null, notify.review.siteUnknown)).toBe(notify.review.siteUnknown);
	});
});

describe('formatReviewMessage', () => {
	it('składa nagłówek, pola i link recenzji', () => {
		const text = formatReviewMessage({
			title: 'Ogłoszenie o przetargu',
			siteName: 'UG Miedzna',
			authorName: 'Jan Kowalski',
			postId: POST_ID,
		});

		expect(text).toContain(notify.review.heading);
		expect(text).toContain(`${notify.review.titleLabel}: Ogłoszenie o przetargu`);
		expect(text).toContain(`${notify.review.siteLabel}: UG Miedzna`);
		expect(text).toContain(`${notify.review.authorLabel}: Jan Kowalski`);
		expect(text).toContain(notify.review.hint);
		expect(text).toContain(reviewPostUrl(POST_ID));
		expect(text).not.toContain('<');
	});

	it('używa fallbacków gdy brak strony i autora', () => {
		const text = formatReviewMessage({
			title: '',
			siteName: null,
			authorName: null,
			postId: POST_ID,
		});

		expect(text).toContain(`${notify.review.titleLabel}: ${common.untitled}`);
		expect(text).toContain(`${notify.review.siteLabel}: ${notify.review.siteUnknown}`);
		expect(text).toContain(`${notify.review.authorLabel}: ${notify.review.authorUnknown}`);
	});
});

describe('callback i klawiatura', () => {
	it('składa callback_data w limicie Telegrama (64 bajty)', () => {
		const data = reviewApproveCallbackData(POST_ID);
		expect(data).toBe(`a:${POST_ID}`);
		expect(Buffer.byteLength(data, 'utf8')).toBeLessThanOrEqual(64);
		expect(parseReviewApproveCallbackData(data)).toBe(POST_ID);
	});

	it('odrzuca obcy albo zepsuty callback', () => {
		expect(parseReviewApproveCallbackData('r:' + POST_ID)).toBeNull();
		expect(parseReviewApproveCallbackData('a:nie-uuid')).toBeNull();
		expect(parseReviewApproveCallbackData(undefined)).toBeNull();
	});

	it('klawiatura ma Akceptuj i link do panelu', () => {
		const markup = reviewInlineKeyboard(POST_ID);
		expect(markup.inline_keyboard[0]).toEqual([
			{ text: notify.review.approveButton, callback_data: `a:${POST_ID}` },
			{ text: notify.review.openButton, url: reviewPostUrl(POST_ID) },
		]);
		expect(reviewOpenOnlyKeyboard(POST_ID).inline_keyboard[0]).toEqual([
			{ text: notify.review.openButton, url: reviewPostUrl(POST_ID) },
		]);
	});

	it('dopisuje stopkę decyzji bez duplikatu', () => {
		expect(appendReviewResult('treść', 'OK')).toBe('treść\n\nOK');
		expect(appendReviewResult('treść\n\nOK', 'OK')).toBe('treść\n\nOK');
	});
});
