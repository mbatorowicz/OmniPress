import { describe, expect, it } from 'vitest';
import { APP } from '@/config/app';
import { common, notify } from '@/i18n';
import { formatReviewMessage, resolveReviewLabel, reviewPostUrl } from './review-model';

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
