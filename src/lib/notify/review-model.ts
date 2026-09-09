import { APP } from '@/config/app';
import { common, notify } from '@/i18n';

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
		reviewPostUrl(input.postId),
	].join('\n');
}
