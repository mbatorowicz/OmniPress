import type { SupabaseClient } from '@supabase/supabase-js';
import { withDraftSavedMeta } from './layout-sync-meta';
import { normalizeSiteAstroLayout } from './parse';
import type { SiteAstroLayout } from './types';
import { emptySiteAstroLayout } from './types';

export async function loadSiteAstroLayout(
	supabase: SupabaseClient,
	siteId: string,
): Promise<SiteAstroLayout> {
	const { data } = await supabase
		.from('sites')
		.select('astro_layout')
		.eq('id', siteId)
		.maybeSingle();

	if (data?.astro_layout) {
		return normalizeSiteAstroLayout(data.astro_layout);
	}

	return emptySiteAstroLayout();
}

export async function saveSiteAstroLayout(
	supabase: SupabaseClient,
	siteId: string,
	layout: SiteAstroLayout,
	options: { updateDraftMeta?: boolean } = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
	const payload = options.updateDraftMeta === false ? layout : withDraftSavedMeta(layout);
	const { error } = await supabase
		.from('sites')
		.update({ astro_layout: payload })
		.eq('id', siteId);

	if (error) return { ok: false, error: 'save_failed' };
	return { ok: true };
}
