import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '../types';

export async function getSessionUser(supabase: SupabaseClient) {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) return null;
	return user;
}

export async function getProfile(
	supabase: SupabaseClient,
	userId: string,
): Promise<Profile | null> {
	const { data, error } = await supabase
		.from('profiles')
		.select('id, role, display_name, default_site_id, created_at, updated_at')
		.eq('id', userId)
		.maybeSingle();

	if (error || !data) return null;
	return data as Profile;
}

export async function getUserSites(supabase: SupabaseClient, userId: string) {
	const { data, error } = await supabase
		.from('user_sites')
		.select('site_id, sites(id, name, slug, is_active)')
		.eq('user_id', userId);

	if (error) return [];
	return data ?? [];
}
