import { adminReview } from '@/i18n';
import type { FlashMessage } from '@/lib/ui/flash';

/** Komunikaty flash strony akceptacji wpisu (`/admin/posts/[id]`). */
export function parsePostReviewFlash(url: URL): FlashMessage[] {
	const params = url.searchParams;
	const messages: FlashMessage[] = [];

	if (params.get('approved') === '1') {
		messages.push({
			variant: 'success',
			message:
				params.get('scheduled') === '1' ? adminReview.approvedScheduled : adminReview.approved,
		});
	}
	if (params.get('saved') === '1') {
		messages.push({ variant: 'success', message: adminReview.edited });
	}
	if (params.get('submitted') === '1') {
		messages.push({ variant: 'success', message: adminReview.submitted });
	}
	if (params.get('rejected') === '1') {
		messages.push({ variant: 'warning', message: adminReview.rejected });
	}
	if (params.get('reopened') === '1') {
		messages.push({ variant: 'info', message: adminReview.reopened });
	}
	if (params.get('pinned') === '1') {
		messages.push({
			variant: 'success',
			message:
				params.get('republish') === '1'
					? adminReview.pinned.savedRepublish
					: adminReview.pinned.saved,
		});
	}
	if (params.get('deactivated') === '1') {
		messages.push({ variant: 'success', message: adminReview.deactivated });
	}
	if (params.get('deleted') === '1') {
		messages.push({ variant: 'success', message: adminReview.deleted });
	}
	if (params.get('remote_warning') === '1') {
		messages.push({ variant: 'warning', message: adminReview.remoteWarning });
	}
	if (params.get('retry') === '1') {
		messages.push({ variant: 'info', message: adminReview.publishLogs.retryQueued });
	}

	const errorCode = params.get('error');
	const errors = adminReview.errors;
	if (errorCode && errorCode in errors) {
		messages.push({ variant: 'error', message: errors[errorCode as keyof typeof errors] });
	}

	return messages;
}
