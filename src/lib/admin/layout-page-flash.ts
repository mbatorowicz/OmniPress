import { adminLayout } from '@/i18n';

export function parseLayoutPageFlash(url: URL): {
	errorMessage: string | null;
	errorDetail: string | null;
	syncSummary: string | null;
	saved: boolean;
	synced: boolean;
	imported: boolean;
} {
	const errorCode = url.searchParams.get('error');
	const layoutErrors = adminLayout.errors;
	const errorMessage =
		errorCode && errorCode in layoutErrors
			? layoutErrors[errorCode as keyof typeof layoutErrors]
			: null;

	return {
		errorMessage,
		errorDetail: url.searchParams.get('sync_detail')?.trim() || null,
		syncSummary: url.searchParams.get('sync_summary')?.trim() || null,
		saved: url.searchParams.get('saved') === '1',
		synced: url.searchParams.get('synced') === '1',
		imported: url.searchParams.get('imported') === '1',
	};
}
