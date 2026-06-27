import { adminLayout } from '@/i18n';

export function parseLayoutPageFlash(url: URL): {
	errorMessage: string | null;
	errorDetail: string | null;
	syncSummary: string | null;
	saved: boolean;
	published: boolean;
	imported: boolean;
	importHrefCount: number | null;
	importPath: string | null;
} {
	const errorCode = url.searchParams.get('error');
	const layoutErrors = adminLayout.errors;
	const errorMessage =
		errorCode && errorCode in layoutErrors
			? layoutErrors[errorCode as keyof typeof layoutErrors]
			: null;

	const importHrefsRaw = url.searchParams.get('import_hrefs');
	const importHrefCount =
		importHrefsRaw !== null && importHrefsRaw !== '' && Number.isFinite(Number(importHrefsRaw))
			? Number(importHrefsRaw)
			: null;

	return {
		errorMessage,
		errorDetail: url.searchParams.get('sync_detail')?.trim() || null,
		syncSummary: url.searchParams.get('sync_summary')?.trim() || null,
		saved: url.searchParams.get('saved') === '1',
		published: url.searchParams.get('published') === '1',
		imported: url.searchParams.get('imported') === '1',
		importHrefCount,
		importPath: url.searchParams.get('import_path')?.trim() || null,
	};
}
