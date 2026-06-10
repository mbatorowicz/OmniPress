import type { FlashMessage } from '@/lib/ui/flash';
import { admin } from '@/i18n';

/** Komunikaty flash dla hubu administracji (/admin). */
export function parseAdminHubFlash(url: URL): FlashMessage[] {
	const messages: FlashMessage[] = [];
	const params = url.searchParams;
	const listLabels = admin.postList;
	const importLabels = admin.importPosts;

	if (params.get('deactivated') === '1') {
		messages.push({ variant: 'success', message: listLabels.deactivated });
	}
	if (params.get('deleted') === '1') {
		messages.push({ variant: 'success', message: listLabels.deleted });
	}

	const bulkDeactivated = Number(params.get('bulk_deactivated') ?? '0');
	if (bulkDeactivated > 0) {
		messages.push({ variant: 'success', message: listLabels.bulkDeactivated(bulkDeactivated) });
	}
	const bulkDeleted = Number(params.get('bulk_deleted') ?? '0');
	if (bulkDeleted > 0) {
		messages.push({ variant: 'success', message: listLabels.bulkDeleted(bulkDeleted) });
	}
	const bulkSkipped = Number(params.get('bulk_skipped') ?? '0');
	if (bulkSkipped > 0) {
		messages.push({ variant: 'warning', message: listLabels.bulkSkipped(bulkSkipped) });
	}

	const errorCode = params.get('error');
	const bulkErrors = admin.bulkErrors as Record<string, string>;
	if (errorCode && errorCode in bulkErrors) {
		const remoteDetail = params.get('remote_detail');
		messages.push({
			variant: 'error',
			message: bulkErrors[errorCode]!,
			detail: errorCode === 'remote_failed' && remoteDetail ? remoteDetail : undefined,
		});
	}

	if (params.get('remote_warning') === '1') {
		const remoteDetail = params.get('remote_detail');
		messages.push({
			variant: 'warning',
			message: listLabels.remoteWarning,
			detail: remoteDetail ?? undefined,
		});
	}

	const importImported = Number(params.get('imported') ?? '0');
	const importUpdated = Number(params.get('updated') ?? '0');
	if (importImported + importUpdated > 0) {
		messages.push({
			variant: 'success',
			message: importLabels.success(importImported, importUpdated),
		});
	}

	const importWarnings = Number(params.get('import_warnings') ?? '0');
	if (importWarnings > 0) {
		const importDetails = params.get('import_details')?.split('\n').filter(Boolean) ?? [];
		messages.push({
			variant: 'warning',
			message: importLabels.warnings(importWarnings),
			detail: importDetails.length
				? `${importLabels.warningsDetailHeading}\n${importDetails.join('\n')}`
				: undefined,
		});
	}

	const importErrorCode = params.get('import_error');
	if (importErrorCode && importErrorCode in importLabels.errors) {
		messages.push({
			variant: 'error',
			message: importLabels.errors[importErrorCode as keyof typeof importLabels.errors]!,
		});
	}

	return messages;
}
