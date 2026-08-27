/**
 * Dane hubu administracji (`/admin`): kolejka wpisów w czterech stanach
 * plus wybór strony dla importu z GitHub.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { listSites } from '@/lib/admin/sites';
import type { Site } from '@/lib/types';

export type AdminQueuePost = {
	id: string;
	title: string;
	status?: string;
	category_name: string | null;
	category_slug: string | null;
	updated_at: string;
	created_at?: string;
	scheduled_publish_at?: string | null;
	sites: { name: string } | null;
};

export type AdminQueueHubData = {
	sites: Site[];
	pending: AdminQueuePost[];
	/** Wpisy w publikacji i zaplanowane w jednej sekcji — patrz `loadAdminQueueHub`. */
	scheduled: AdminQueuePost[];
	published: AdminQueuePost[];
	defaultImportSiteId: string;
};

const POST_SELECT =
	'id, title, status, category_name, category_slug, created_at, updated_at, scheduled_publish_at, sites(name)';

/** Liczba ostatnich opublikowanych wpisów pokazywanych w kolejce. */
const PUBLISHED_LIMIT = 30;

/** Strona domyślna dla importu: ta z adresu, jeśli istnieje; inaczej pierwsza z listy. */
export function resolveImportSiteId(sites: Site[], requestedSiteId: string | null): string {
	if (requestedSiteId && sites.some((s) => s.id === requestedSiteId)) return requestedSiteId;
	return sites[0]?.id ?? '';
}

export async function loadAdminQueueHub(
	supabase: SupabaseClient,
	requestedSiteId: string | null,
): Promise<AdminQueueHubData> {
	const sites = await listSites(supabase);

	const byStatus = async (
		status: string,
		orderColumn: string,
		ascending: boolean,
		limit?: number,
	): Promise<AdminQueuePost[]> => {
		let query = supabase
			.from('posts')
			.select(POST_SELECT)
			.eq('status', status)
			.order(orderColumn, { ascending });
		if (limit) query = query.limit(limit);
		const { data } = await query;
		// Supabase typuje zagnieżdżone `sites(name)` jako tablicę, choć relacja jest 1:1.
		return (data ?? []) as unknown as AdminQueuePost[];
	};

	const [pending, scheduled, publishing, published] = await Promise.all([
		byStatus('pending', 'created_at', false),
		byStatus('scheduled', 'scheduled_publish_at', true),
		byStatus('publishing', 'created_at', false),
		byStatus('published', 'updated_at', false, PUBLISHED_LIMIT),
	]);

	return {
		sites,
		pending,
		// Wpisy w trakcie publikacji idą do sekcji „Zaplanowane" ze znacznikiem „W toku".
		scheduled: [...publishing, ...scheduled],
		published,
		defaultImportSiteId: resolveImportSiteId(sites, requestedSiteId),
	};
}
