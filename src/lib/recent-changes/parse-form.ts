import type { RecentChangeKind, RecentChangeEntry } from './types';

const ALLOWED_MANUAL_KINDS: RecentChangeKind[] = ['page', 'manual'];

export function parseAnnounceForm(
	form: FormData,
): { ok: true; entry: RecentChangeEntry } | { ok: false; error: string } {
	const title = String(form.get('change_title') ?? '').trim();
	let href = String(form.get('change_href') ?? '').trim();
	const kindRaw = String(form.get('change_kind') ?? 'manual').trim();

	if (title.length < 3) return { ok: false, error: 'title_required' };
	if (!href.startsWith('/')) return { ok: false, error: 'invalid_href' };
	if (href.includes(' ') || href.includes('\n')) return { ok: false, error: 'invalid_href' };
	if (!ALLOWED_MANUAL_KINDS.includes(kindRaw as RecentChangeKind)) {
		return { ok: false, error: 'invalid_kind' };
	}

	if (href.length > 1 && href.endsWith('/')) {
		href = href.replace(/\/+$/, '');
	}

	return {
		ok: true,
		entry: {
			title,
			href,
			kind: kindRaw as 'page' | 'manual',
			changedAt: new Date().toISOString(),
		},
	};
}
