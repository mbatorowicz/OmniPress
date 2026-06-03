import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';

export type EditorRow = Pick<Profile, 'id' | 'display_name' | 'default_site_id'> & {
	email?: string;
};

export async function listEditors(supabase: SupabaseClient): Promise<EditorRow[]> {
	const { data } = await supabase
		.from('profiles')
		.select('id, display_name, default_site_id, role')
		.eq('role', 'editor')
		.order('display_name');
	return (data ?? []) as EditorRow[];
}

export async function getEditorSiteIds(
	supabase: SupabaseClient,
	userId: string,
): Promise<string[]> {
	const { data } = await supabase.from('user_sites').select('site_id').eq('user_id', userId);
	return (data ?? []).map((r) => r.site_id);
}

export async function saveEditorSites(
	supabase: SupabaseClient,
	userId: string,
	siteIds: string[],
	defaultSiteId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
	if (defaultSiteId && !siteIds.includes(defaultSiteId)) {
		return { ok: false, error: 'invalid_default' };
	}

	await supabase.from('user_sites').delete().eq('user_id', userId);

	if (siteIds.length > 0) {
		const rows = siteIds.map((site_id) => ({ user_id: userId, site_id }));
		const { error } = await supabase.from('user_sites').insert(rows);
		if (error) return { ok: false, error: 'save_failed' };
	}

	const { error: profileError } = await supabase
		.from('profiles')
		.update({ default_site_id: defaultSiteId })
		.eq('id', userId);

	if (profileError) return { ok: false, error: 'save_failed' };
	return { ok: true };
}

export async function syncSiteDestinations(
	supabase: SupabaseClient,
	siteId: string,
	links: { destination_id: string; is_default: boolean }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
	await supabase.from('site_destinations').delete().eq('site_id', siteId);

	if (links.length === 0) return { ok: true };

	const rows = links.map((link, index) => ({
		site_id: siteId,
		destination_id: link.destination_id,
		is_default: link.is_default,
		sort_order: index,
	}));

	const { error } = await supabase.from('site_destinations').insert(rows);
	if (error) return { ok: false, error: 'save_failed' };
	return { ok: true };
}
